import { prisma } from '../../shared/prisma.js'
import { registrarAuditoria } from '../../audit/audit.service.js'
import { buscarOCrearTercero } from '../../document-processing/terceros.interno.js'
import { TIPOS_DOCUMENTO } from '../../document-processing/tiposDocumento.js'
import { leerArchivo } from '../cargas/cargas.storage.js'
import { ejecutarValidaciones, obtenerUltimosResultados } from '../../validation-engine/engine.js'

const ESTADOS_TERMINALES = ['APROBADO', 'RECHAZADO']

class DocumentoError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.status = status
  }
}

function serializarDocumento(doc, validaciones) {
  return {
    id: doc.id,
    archivoOrigenId: doc.archivoOrigenId,
    cargaId: doc.archivoOrigen?.cargaId ?? null,
    tipoDocumento: doc.tipoDocumento,
    numeroDocumento: doc.numeroDocumento,
    prefijo: doc.prefijo,
    fechaEmision: doc.fechaEmision,
    tercero: doc.tercero
      ? { id: doc.tercero.id, identificacion: doc.tercero.identificacion, razonSocial: doc.tercero.razonSocial }
      : null,
    subtotal: doc.subtotal,
    totalImpuestos: doc.totalImpuestos,
    total: doc.total,
    moneda: doc.moneda,
    estado: doc.estado,
    textoExtraido: doc.textoExtraido,
    observaciones: doc.observaciones,
    impuestos: doc.impuestos
      ? doc.impuestos.map((i) => ({ codigo: i.impuesto.codigo, base: i.base, valor: i.valor }))
      : undefined,
    validaciones,
    hayBloqueante: Array.isArray(validaciones)
      ? validaciones.some((v) => v.severidad === 'BLOQUEANTE' && v.resultado === 'FALLA')
      : undefined,
    creadoEn: doc.creadoEn,
  }
}

const INCLUYE_DETALLE = {
  tercero: true,
  archivoOrigen: { select: { cargaId: true, nombreOriginal: true, extension: true } },
  impuestos: { include: { impuesto: true } },
}

export async function listarDocumentos({ empresaId, estado, tipoDocumento, page = 1, pageSize = 20 }) {
  const where = {
    empresaId,
    ...(estado ? { estado } : {}),
    ...(tipoDocumento ? { tipoDocumento } : {}),
  }
  const [total, documentos] = await Promise.all([
    prisma.documento.count({ where }),
    prisma.documento.findMany({
      where,
      include: { tercero: true, archivoOrigen: { select: { cargaId: true } } },
      orderBy: { creadoEn: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])
  return { data: documentos.map((doc) => serializarDocumento(doc)), total, page, pageSize }
}

export async function obtenerDocumento({ empresaId, documentoId }) {
  const doc = await prisma.documento.findFirst({ where: { id: documentoId, empresaId }, include: INCLUYE_DETALLE })
  if (!doc) throw new DocumentoError('Documento no encontrado', 404)
  const validaciones = await obtenerUltimosResultados(documentoId)
  return serializarDocumento(doc, validaciones)
}

export async function actualizarDocumento({ empresaId, documentoId, usuarioId, cambios }) {
  const existente = await prisma.documento.findFirst({ where: { id: documentoId, empresaId } })
  if (!existente) throw new DocumentoError('Documento no encontrado', 404)

  const data = {}

  if (cambios.tipoDocumento !== undefined) {
    if (!TIPOS_DOCUMENTO.includes(cambios.tipoDocumento)) {
      throw new DocumentoError(`tipoDocumento debe ser uno de: ${TIPOS_DOCUMENTO.join(', ')}`)
    }
    data.tipoDocumento = cambios.tipoDocumento
  }
  if (cambios.numeroDocumento !== undefined) data.numeroDocumento = cambios.numeroDocumento
  if (cambios.prefijo !== undefined) data.prefijo = cambios.prefijo
  if (cambios.fechaEmision !== undefined) {
    const fecha = cambios.fechaEmision ? new Date(cambios.fechaEmision) : null
    if (cambios.fechaEmision && Number.isNaN(fecha?.getTime())) {
      throw new DocumentoError('fechaEmision inválida')
    }
    data.fechaEmision = fecha
  }
  if (cambios.subtotal !== undefined) data.subtotal = cambios.subtotal
  if (cambios.total !== undefined) data.total = cambios.total
  if (cambios.observaciones !== undefined) data.observaciones = cambios.observaciones

  if (cambios.terceroNit) {
    const tercero = await buscarOCrearTercero({
      empresaId,
      nit: cambios.terceroNit,
      razonSocial: cambios.terceroRazonSocial || cambios.terceroNit,
    })
    data.terceroId = tercero.id
  }

  const camposCambiados = Object.keys(data)
  const actualizado = await prisma.documento.update({ where: { id: documentoId }, data, include: INCLUYE_DETALLE })

  for (const campo of camposCambiados) {
    await registrarAuditoria({
      empresaId,
      usuarioId,
      accion: 'MODIFICAR_DOCUMENTO',
      entidad: 'documento',
      entidadId: documentoId,
      campo,
      valorAnterior: existente[campo] !== undefined && existente[campo] !== null ? String(existente[campo]) : null,
      valorNuevo: data[campo] !== null && data[campo] !== undefined ? String(data[campo]) : null,
    })
  }

  // Datos cambiaron: se re-evalúan las reglas y el documento vuelve a
  // PENDIENTE_REVISION (una aprobación previa queda invalidada por la edición).
  const { resultados } = await ejecutarValidaciones(documentoId)
  const final = await prisma.documento.findUniqueOrThrow({ where: { id: documentoId }, include: INCLUYE_DETALLE })

  return serializarDocumento(final, resultados)
}

export async function revalidarDocumento({ empresaId, documentoId }) {
  const existe = await prisma.documento.findFirst({ where: { id: documentoId, empresaId } })
  if (!existe) throw new DocumentoError('Documento no encontrado', 404)

  const { resultados } = await ejecutarValidaciones(documentoId)
  const doc = await prisma.documento.findUniqueOrThrow({ where: { id: documentoId }, include: INCLUYE_DETALLE })
  return serializarDocumento(doc, resultados)
}

export async function aprobarDocumento({ empresaId, documentoId, usuarioId }) {
  const doc = await prisma.documento.findFirst({ where: { id: documentoId, empresaId } })
  if (!doc) throw new DocumentoError('Documento no encontrado', 404)
  if (ESTADOS_TERMINALES.includes(doc.estado)) {
    throw new DocumentoError(`El documento ya está en estado ${doc.estado}`, 409)
  }

  const validaciones = await obtenerUltimosResultados(documentoId)
  const hayBloqueante = validaciones.some((v) => v.severidad === 'BLOQUEANTE' && v.resultado === 'FALLA')
  if (hayBloqueante) {
    throw new DocumentoError('No se puede aprobar: hay errores bloqueantes sin resolver. Corrige y revalida.', 409)
  }

  const actualizado = await prisma.documento.update({
    where: { id: documentoId },
    data: { estado: 'APROBADO' },
    include: INCLUYE_DETALLE,
  })

  await registrarAuditoria({
    empresaId,
    usuarioId,
    accion: 'APROBAR_DOCUMENTO',
    entidad: 'documento',
    entidadId: documentoId,
    campo: 'estado',
    valorAnterior: doc.estado,
    valorNuevo: 'APROBADO',
  })

  return serializarDocumento(actualizado, validaciones)
}

export async function rechazarDocumento({ empresaId, documentoId, usuarioId, motivo }) {
  const doc = await prisma.documento.findFirst({ where: { id: documentoId, empresaId } })
  if (!doc) throw new DocumentoError('Documento no encontrado', 404)
  if (ESTADOS_TERMINALES.includes(doc.estado)) {
    throw new DocumentoError(`El documento ya está en estado ${doc.estado}`, 409)
  }

  const actualizado = await prisma.documento.update({
    where: { id: documentoId },
    data: { estado: 'RECHAZADO', observaciones: motivo || doc.observaciones },
    include: INCLUYE_DETALLE,
  })

  await registrarAuditoria({
    empresaId,
    usuarioId,
    accion: 'RECHAZAR_DOCUMENTO',
    entidad: 'documento',
    entidadId: documentoId,
    campo: 'estado',
    valorAnterior: doc.estado,
    valorNuevo: 'RECHAZADO',
  })

  const validaciones = await obtenerUltimosResultados(documentoId)
  return serializarDocumento(actualizado, validaciones)
}

export async function obtenerArchivoOriginalDeDocumento({ empresaId, documentoId }) {
  const doc = await prisma.documento.findFirst({ where: { id: documentoId, empresaId }, include: { archivoOrigen: true } })
  if (!doc) throw new DocumentoError('Documento no encontrado', 404)
  if (!doc.archivoOrigen) throw new DocumentoError('Este documento no tiene un archivo original asociado', 404)

  const buffer = await leerArchivo(doc.archivoOrigen.rutaAlmacenamiento)
  return { buffer, nombreOriginal: doc.archivoOrigen.nombreOriginal, extension: doc.archivoOrigen.extension }
}

export { DocumentoError }
