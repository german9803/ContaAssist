import { prisma } from '../shared/prisma.js'
import { registrarAuditoria } from '../audit/audit.service.js'
import { obtenerAdaptador } from './registry.js'

const ESTADOS_TRANSFORMABLES = ['APROBADO', 'LISTO_PARA_EXPORTAR']

export class TransformacionError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.status = status
  }
}

const INCLUYE_DOCUMENTO = {
  tercero: true,
  cuentaContable: true,
  centroCosto: true,
  formaPago: true,
  impuestos: { include: { impuesto: true } },
}

async function resolverAdaptador(sistemaDestinoCodigo) {
  const sistemaDestino = await prisma.sistemaDestino.findUnique({ where: { codigo: sistemaDestinoCodigo } })
  if (!sistemaDestino) throw new TransformacionError(`El sistema destino "${sistemaDestinoCodigo}" no existe`, 404)

  const adaptador = obtenerAdaptador(sistemaDestinoCodigo)
  if (!adaptador) {
    throw new TransformacionError(`Todavía no hay un adaptador implementado para "${sistemaDestinoCodigo}"`, 501)
  }

  return { sistemaDestino, adaptador }
}

async function cargarMapeos(empresaId, sistemaDestinoId) {
  const [cuentas, terceros, formasPago] = await Promise.all([
    prisma.mapeoCuenta.findMany({ where: { empresaId, sistemaDestinoId } }),
    prisma.mapeoTercero.findMany({ where: { empresaId, sistemaDestinoId } }),
    prisma.mapeoFormaPago.findMany({ where: { empresaId, sistemaDestinoId } }),
  ])
  return {
    cuentas: new Map(cuentas.map((m) => [m.cuentaContableId, m.codigoDestino])),
    terceros: new Map(terceros.map((m) => [m.terceroId, m.codigoDestino])),
    formasPago: new Map(formasPago.map((m) => [m.formaPagoId, m.codigoDestino])),
  }
}

async function cargarDocumentos(empresaId, documentoIds, estadosPermitidos) {
  const documentos = await prisma.documento.findMany({
    where: { id: { in: documentoIds }, empresaId, estado: { in: estadosPermitidos } },
    include: INCLUYE_DOCUMENTO,
  })
  if (documentos.length !== documentoIds.length) {
    throw new TransformacionError(
      `Alguno de los documentos no existe, no pertenece a esta empresa o no está en estado ${estadosPermitidos.join('/')}`,
      409,
    )
  }
  return documentos
}

// Agrupa los errores de prerequisito por documento: el que no tiene ningún
// error queda listo para exportar, el resto se queda esperando a que se
// complete su mapeo — un documento con problemas nunca bloquea el lote.
export function clasificarPorPrerequisitos(documentos, errores) {
  const erroresPorDocumento = new Map()
  for (const error of errores) {
    if (!erroresPorDocumento.has(error.documentoId)) erroresPorDocumento.set(error.documentoId, [])
    erroresPorDocumento.get(error.documentoId).push(error.mensaje)
  }

  const listos = []
  const pendientes = []
  for (const documento of documentos) {
    const erroresDoc = erroresPorDocumento.get(documento.id)
    if (erroresDoc?.length) pendientes.push({ documentoId: documento.id, errores: erroresDoc })
    else listos.push(documento.id)
  }
  return { listos, pendientes }
}

// Paso 6 de docs/data-flow.md: resuelve el mapeo contra el sistema destino
// elegido y marca LISTO_PARA_EXPORTAR los documentos sin errores de
// prerequisito; el resto se queda en APROBADO a la espera del mapeo.
export async function resolverPrerequisitosExportacion({ empresaId, usuarioId, sistemaDestinoCodigo, documentoIds }) {
  const { sistemaDestino, adaptador } = await resolverAdaptador(sistemaDestinoCodigo)
  const documentos = await cargarDocumentos(empresaId, documentoIds, ESTADOS_TRANSFORMABLES)
  const mapeos = await cargarMapeos(empresaId, sistemaDestino.id)

  const errores = adaptador.validarPrerequisitos(documentos, mapeos)
  const { listos, pendientes } = clasificarPorPrerequisitos(documentos, errores)

  const documentosPorId = new Map(documentos.map((d) => [d.id, d]))
  const porActualizar = listos.filter((id) => documentosPorId.get(id).estado === 'APROBADO')

  if (porActualizar.length > 0) {
    await prisma.documento.updateMany({ where: { id: { in: porActualizar } }, data: { estado: 'LISTO_PARA_EXPORTAR' } })
    for (const documentoId of porActualizar) {
      await registrarAuditoria({
        empresaId,
        usuarioId,
        accion: 'MARCAR_LISTO_PARA_EXPORTAR',
        entidad: 'documento',
        entidadId: documentoId,
        campo: 'estado',
        valorAnterior: 'APROBADO',
        valorNuevo: 'LISTO_PARA_EXPORTAR',
      })
    }
  }

  return { listos, pendientes }
}

// Aplica el adaptador sobre documentos ya listos para exportar. No genera el
// archivo físico ni persiste nada — eso es responsabilidad de export-engine
// (Fase 13), que toma este resultado y llama adaptador.generarArchivo().
export async function transformarParaExportar({ empresaId, sistemaDestinoCodigo, documentoIds }) {
  const { sistemaDestino, adaptador } = await resolverAdaptador(sistemaDestinoCodigo)
  const documentos = await cargarDocumentos(empresaId, documentoIds, ['LISTO_PARA_EXPORTAR'])
  const mapeos = await cargarMapeos(empresaId, sistemaDestino.id)

  return adaptador.transformar(documentos, mapeos)
}
