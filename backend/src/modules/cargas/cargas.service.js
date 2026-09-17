import { randomUUID } from 'node:crypto'
import { prisma } from '../../shared/prisma.js'
import { registrarAuditoria } from '../../audit/audit.service.js'
import { validarArchivo, TIPOS_ORIGEN_VALIDOS } from './cargas.validacionArchivo.js'
import { calcularHash, guardarArchivo, leerArchivo } from './cargas.storage.js'

class CargaError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.status = status
  }
}

function serializarArchivo(archivo) {
  return {
    id: archivo.id,
    nombreOriginal: archivo.nombreOriginal,
    extension: archivo.extension,
    tamanoBytes: Number(archivo.tamanoBytes),
    estado: archivo.estado,
    mensajeError: archivo.mensajeError,
  }
}

function serializarCarga(carga) {
  return {
    id: carga.id,
    tipoOrigen: carga.tipoOrigen,
    cantidadArchivos: carga.cantidadArchivos,
    estado: carga.estado,
    iniciadoEn: carga.iniciadoEn,
    finalizadoEn: carga.finalizadoEn,
    usuarioId: carga.usuarioId,
    archivos: carga.archivos ? carga.archivos.map(serializarArchivo) : undefined,
  }
}

// Un archivo rechazado en la puerta (contenido inválido o duplicado) nunca
// llegó a "recibirse" de verdad, así que no ocupa una fila en archivo_origen
// (el índice único empresa_id+hash_sha256 es precisamente lo que impediría
// guardar dos filas con el mismo hash, incluso si una fuera ERROR). Se reporta
// solo en la respuesta de esta petición — no queda historial por-archivo del
// rechazo, solo el conteo agregado en `cargas` (limitación conocida de Fase 6).
function archivoRechazado(nombreOriginal, motivo) {
  return { id: null, nombreOriginal, extension: null, tamanoBytes: null, estado: 'RECHAZADO', mensajeError: motivo }
}

// Recibe y almacena los archivos de una carga (sección 11). NO extrae ni
// interpreta su contenido contable todavía — eso es responsabilidad del
// motor de procesamiento de Fase 7, que parte de archivo_origen.estado='RECIBIDO'.
export async function crearCarga({ empresaId, usuarioId, tipoOrigen, archivos }) {
  if (!TIPOS_ORIGEN_VALIDOS.includes(tipoOrigen)) {
    throw new CargaError(`tipoOrigen debe ser uno de: ${TIPOS_ORIGEN_VALIDOS.join(', ')}`)
  }
  if (!archivos || archivos.length === 0) {
    throw new CargaError('Debes adjuntar al menos un archivo')
  }

  const carga = await prisma.carga.create({
    data: { empresaId, usuarioId, tipoOrigen, cantidadArchivos: archivos.length, estado: 'PROCESANDO' },
  })

  const hashesEnEsteLote = new Set()
  const resultados = []

  for (const archivo of archivos) {
    const validacion = await validarArchivo(archivo.buffer, archivo.originalname, tipoOrigen)

    if (!validacion.valido) {
      resultados.push(archivoRechazado(archivo.originalname, validacion.motivo))
      continue
    }

    const hash = calcularHash(archivo.buffer)

    if (hashesEnEsteLote.has(hash)) {
      resultados.push(archivoRechazado(archivo.originalname, 'Archivo duplicado dentro de esta misma carga'))
      continue
    }

    const yaExiste = await prisma.archivoOrigen.findUnique({
      where: { empresaId_hashSha256: { empresaId, hashSha256: hash } },
    })
    if (yaExiste) {
      resultados.push(
        archivoRechazado(archivo.originalname, 'Ya existe un archivo idéntico cargado previamente en esta empresa'),
      )
      continue
    }
    hashesEnEsteLote.add(hash)

    const archivoId = randomUUID()
    const rutaAlmacenamiento = await guardarArchivo({
      empresaId,
      cargaId: carga.id,
      archivoId,
      extension: validacion.extension,
      buffer: archivo.buffer,
    })

    resultados.push(
      serializarArchivo(
        await prisma.archivoOrigen.create({
          data: {
            id: archivoId,
            cargaId: carga.id,
            empresaId,
            nombreOriginal: archivo.originalname.slice(0, 260),
            extension: validacion.extension,
            tamanoBytes: BigInt(archivo.buffer.length),
            hashSha256: hash,
            rutaAlmacenamiento,
            estado: 'RECIBIDO',
          },
        }),
      ),
    )
  }

  const cantidadAceptados = resultados.filter((r) => r.estado === 'RECIBIDO').length
  const cargaFinal = await prisma.carga.update({
    where: { id: carga.id },
    data: { estado: cantidadAceptados > 0 ? 'RECIBIDO' : 'ERROR', finalizadoEn: new Date() },
  })

  await registrarAuditoria({
    empresaId,
    usuarioId,
    accion: 'CARGAR_ARCHIVOS',
    entidad: 'carga',
    entidadId: carga.id,
    valorNuevo: `${tipoOrigen}: ${cantidadAceptados}/${archivos.length} archivos aceptados`,
  })

  // `resultados` ya viene serializado (mezcla filas persistidas y rechazos
  // transitorios) — no debe volver a pasar por el mapeo de serializarCarga.
  return { ...serializarCarga(cargaFinal), archivos: resultados }
}

export async function listarCargas({ empresaId, estado, page = 1, pageSize = 20 }) {
  const where = { empresaId, ...(estado ? { estado } : {}) }
  const [total, cargas] = await Promise.all([
    prisma.carga.count({ where }),
    prisma.carga.findMany({ where, orderBy: { iniciadoEn: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
  ])
  return { data: cargas.map((c) => serializarCarga(c)), total, page, pageSize }
}

export async function obtenerCarga({ empresaId, cargaId }) {
  const carga = await prisma.carga.findFirst({ where: { id: cargaId, empresaId }, include: { archivos: true } })
  if (!carga) throw new CargaError('Carga no encontrada', 404)
  return serializarCarga(carga)
}

export async function listarArchivosDeCarga({ empresaId, cargaId }) {
  const carga = await prisma.carga.findFirst({ where: { id: cargaId, empresaId } })
  if (!carga) throw new CargaError('Carga no encontrada', 404)
  const archivos = await prisma.archivoOrigen.findMany({ where: { cargaId }, orderBy: { nombreOriginal: 'asc' } })
  return archivos.map(serializarArchivo)
}

export async function obtenerArchivoParaDescarga({ empresaId, cargaId, archivoId }) {
  const archivo = await prisma.archivoOrigen.findFirst({ where: { id: archivoId, cargaId, empresaId } })
  if (!archivo || archivo.estado === 'ERROR') throw new CargaError('Archivo no encontrado', 404)
  const buffer = await leerArchivo(archivo.rutaAlmacenamiento)
  return { buffer, nombreOriginal: archivo.nombreOriginal, extension: archivo.extension }
}

export { CargaError }
