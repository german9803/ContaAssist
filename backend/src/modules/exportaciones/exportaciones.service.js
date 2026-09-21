import { prisma } from '../../shared/prisma.js'
import {
  ExportacionError,
  previsualizarExportacion,
  generarExportacion,
} from '../../export-engine/exportEngine.js'
import { leerArchivoExportacion } from '../../export-engine/exportEngine.storage.js'

function serializarExportacion(exportacion) {
  return {
    id: exportacion.id,
    sistemaDestino: exportacion.sistemaDestino
      ? { codigo: exportacion.sistemaDestino.codigo, nombre: exportacion.sistemaDestino.nombre }
      : undefined,
    tipoInformacion: exportacion.tipoInformacion,
    periodoInicio: exportacion.periodoInicio,
    periodoFin: exportacion.periodoFin,
    versionFormato: exportacion.versionFormato,
    cantidadDocumentos: exportacion.cantidadDocumentos,
    estado: exportacion.estado,
    creadoEn: exportacion.creadoEn,
  }
}

export async function previsualizar({ empresaId, usuarioId, sistemaDestino, tipoInformacion, periodoInicio, periodoFin }) {
  return previsualizarExportacion({
    empresaId,
    usuarioId,
    sistemaDestinoCodigo: sistemaDestino,
    tipoInformacion,
    periodoInicio,
    periodoFin,
  })
}

export async function crearExportacion({
  empresaId,
  usuarioId,
  sistemaDestino,
  tipoInformacion,
  periodoInicio,
  periodoFin,
  parametrosAdaptador,
}) {
  const { exportacion, pendientes } = await generarExportacion({
    empresaId,
    usuarioId,
    sistemaDestinoCodigo: sistemaDestino,
    tipoInformacion,
    periodoInicio,
    periodoFin,
    parametrosAdaptador,
  })
  return { ...serializarExportacion(exportacion), pendientes }
}

export async function listarExportaciones({ empresaId, page = 1, pageSize = 20 }) {
  const where = { empresaId }
  const [total, exportaciones] = await Promise.all([
    prisma.exportacion.count({ where }),
    prisma.exportacion.findMany({
      where,
      include: { sistemaDestino: true },
      orderBy: { creadoEn: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])
  return { data: exportaciones.map(serializarExportacion), total, page, pageSize }
}

export async function obtenerExportacion({ empresaId, exportacionId }) {
  const exportacion = await prisma.exportacion.findFirst({
    where: { id: exportacionId, empresaId },
    include: { sistemaDestino: true },
  })
  if (!exportacion) throw new ExportacionError('Exportación no encontrada', 404)
  return serializarExportacion(exportacion)
}

export async function obtenerArchivoParaDescarga({ empresaId, exportacionId }) {
  const exportacion = await prisma.exportacion.findFirst({ where: { id: exportacionId, empresaId } })
  if (!exportacion) throw new ExportacionError('Exportación no encontrada', 404)
  if (!exportacion.rutaArchivoGenerado) throw new ExportacionError('Esta exportación no tiene un archivo generado', 404)

  const buffer = await leerArchivoExportacion(exportacion.rutaArchivoGenerado)
  const extension = exportacion.rutaArchivoGenerado.split('.').pop()
  return { buffer, extension, nombreArchivo: `exportacion_${exportacion.id}.${extension}` }
}

export { ExportacionError }
