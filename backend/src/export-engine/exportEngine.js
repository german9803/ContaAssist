import crypto from 'node:crypto'
import { prisma } from '../shared/prisma.js'
import { registrarAuditoria } from '../audit/audit.service.js'
import { resolverPrerequisitosExportacion, transformarParaExportar } from '../transformation-engine/engine.js'
import { obtenerAdaptador } from '../transformation-engine/registry.js'
import { obtenerUltimosResultados } from '../validation-engine/engine.js'
import { guardarArchivoExportacion } from './exportEngine.storage.js'

export class ExportacionError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.status = status
  }
}

// "Tipo de información" (sección 16) → tipos de documento que ya existen.
// BANCOS llega en Fase 15, cuando exista ese módulo de negocio — no se
// inventa un mapeo para un tipo de documento que todavía no existe.
export const TIPOS_DOCUMENTO_POR_INFORMACION = {
  COMPRAS: ['FACTURA_COMPRA'],
  VENTAS: ['FACTURA_VENTA'],
}

const ESTADOS_CANDIDATOS = ['APROBADO', 'LISTO_PARA_EXPORTAR']

function validarPeriodo({ tipoInformacion, periodoInicio, periodoFin }) {
  if (!TIPOS_DOCUMENTO_POR_INFORMACION[tipoInformacion]) {
    throw new ExportacionError(
      `tipoInformacion debe ser uno de: ${Object.keys(TIPOS_DOCUMENTO_POR_INFORMACION).join(', ')} (BANCOS llega en Fase 15)`,
    )
  }
  const inicio = new Date(periodoInicio)
  const fin = new Date(periodoFin)
  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime()) || inicio > fin) {
    throw new ExportacionError('El período (periodoInicio/periodoFin) es inválido')
  }
  return { inicio, fin }
}

async function resolverSistemaDestino(codigo) {
  if (!codigo) throw new ExportacionError('sistemaDestino es requerido (EXCEL o CSV; WORDOFFICE/SIIGO siguen bloqueados)')
  const sistema = await prisma.sistemaDestino.findUnique({ where: { codigo } })
  if (!sistema) throw new ExportacionError(`El sistema destino "${codigo}" no existe`, 404)
  return sistema
}

function buscarCandidatos({ empresaId, tipoInformacion, inicio, fin }) {
  return prisma.documento.findMany({
    where: {
      empresaId,
      tipoDocumento: { in: TIPOS_DOCUMENTO_POR_INFORMACION[tipoInformacion] },
      estado: { in: ESTADOS_CANDIDATOS },
      fechaEmision: { gte: inicio, lte: fin },
    },
    select: { id: true },
  })
}

// Paso 3 de docs/export-engine.md: re-chequea las reglas BLOQUEANTE por si
// algo cambió desde la aprobación. Relee el último resultado guardado en vez
// de llamar ejecutarValidaciones — esa función deja el documento en
// PENDIENTE_REVISION como efecto secundario (ver validation-engine/engine.js),
// lo que sacaría del flujo de exportación a un documento que sigue siendo válido.
async function excluirBloqueantes(documentoIds) {
  const listos = []
  const excluidos = []
  for (const documentoId of documentoIds) {
    const resultados = await obtenerUltimosResultados(documentoId)
    const hayBloqueante = resultados.some((r) => r.severidad === 'BLOQUEANTE' && r.resultado === 'FALLA')
    if (hayBloqueante) excluidos.push(documentoId)
    else listos.push(documentoId)
  }
  return { listos, excluidos }
}

function combinarPendientes(pendientes, excluidosPorBloqueante) {
  return [
    ...pendientes,
    ...excluidosPorBloqueante.map((documentoId) => ({
      documentoId,
      errores: ['Tiene una regla bloqueante en falla; corrige y vuelve a aprobar'],
    })),
  ]
}

// Paso 1-3 del flujo (sección 16): busca candidatos, resuelve prerequisitos de
// mapeo (Fase 12) y descarta bloqueantes, sin generar ningún archivo. Usado
// tanto por el preview como por la generación real, así que ambos ven
// exactamente el mismo resumen antes de confirmar.
async function prepararLote({ empresaId, usuarioId, sistemaDestinoCodigo, tipoInformacion, periodoInicio, periodoFin }) {
  const { inicio, fin } = validarPeriodo({ tipoInformacion, periodoInicio, periodoFin })
  await resolverSistemaDestino(sistemaDestinoCodigo)

  const candidatos = await buscarCandidatos({ empresaId, tipoInformacion, inicio, fin })
  if (candidatos.length === 0) {
    return { inicio, fin, documentoIds: [], pendientes: [], sinCandidatos: true }
  }

  const { listos, pendientes } = await resolverPrerequisitosExportacion({
    empresaId,
    usuarioId,
    sistemaDestinoCodigo,
    documentoIds: candidatos.map((d) => d.id),
  })
  const { listos: documentoIds, excluidos } = await excluirBloqueantes(listos)

  return { inicio, fin, documentoIds, pendientes: combinarPendientes(pendientes, excluidos), sinCandidatos: false }
}

export async function previsualizarExportacion(datos) {
  const { documentoIds, pendientes, sinCandidatos } = await prepararLote(datos)
  return { listos: documentoIds.length, pendientes, sinCandidatos }
}

export async function generarExportacion({
  empresaId,
  usuarioId,
  sistemaDestinoCodigo,
  tipoInformacion,
  periodoInicio,
  periodoFin,
  parametrosAdaptador,
}) {
  const adaptador = obtenerAdaptador(sistemaDestinoCodigo)
  if (!adaptador) throw new ExportacionError(`Todavía no hay un adaptador implementado para "${sistemaDestinoCodigo}"`, 501)

  const { inicio, fin, documentoIds, pendientes, sinCandidatos } = await prepararLote({
    empresaId,
    usuarioId,
    sistemaDestinoCodigo,
    tipoInformacion,
    periodoInicio,
    periodoFin,
  })

  if (sinCandidatos) {
    throw new ExportacionError('No hay documentos elegibles para este período y tipo de información', 409)
  }
  if (documentoIds.length === 0) {
    throw new ExportacionError(
      'Ningún documento del período quedó listo para exportar (revisa mapeos y bloqueantes pendientes)',
      409,
    )
  }

  const sistemaDestino = await resolverSistemaDestino(sistemaDestinoCodigo)
  const registros = await transformarParaExportar({ empresaId, sistemaDestinoCodigo, documentoIds })
  let buffer
  try {
    buffer = await adaptador.generarArchivo(registros, parametrosAdaptador)
  } catch (error) {
    // Un adaptador puede rechazar parámetros específicos suyos (ej. WordOffice
    // exige "terceroInterno") — se traduce a 400 igual que cualquier otro
    // error de validación de esta capa, en vez de caer al 500 genérico.
    throw new ExportacionError(error.message, error.status ?? 400)
  }

  const exportacionId = crypto.randomUUID()
  const rutaArchivoGenerado = await guardarArchivoExportacion({
    empresaId,
    exportacionId,
    extension: adaptador.extension,
    buffer,
  })

  const exportacion = await prisma.exportacion.create({
    data: {
      id: exportacionId,
      empresaId,
      usuarioId,
      sistemaDestinoId: sistemaDestino.id,
      tipoInformacion,
      periodoInicio: inicio,
      periodoFin: fin,
      versionFormato: adaptador.versionFormato,
      cantidadDocumentos: documentoIds.length,
      rutaArchivoGenerado,
      estado: 'GENERADA',
      documentos: { create: documentoIds.map((documentoId) => ({ documentoId })) },
    },
    include: { sistemaDestino: true },
  })

  await prisma.documento.updateMany({ where: { id: { in: documentoIds } }, data: { estado: 'EXPORTADO' } })

  await registrarAuditoria({
    empresaId,
    usuarioId,
    accion: 'GENERAR_EXPORTACION',
    entidad: 'exportacion',
    entidadId: exportacion.id,
    campo: 'cantidadDocumentos',
    valorNuevo: String(documentoIds.length),
  })

  return { exportacion, pendientes }
}
