import { randomUUID } from 'node:crypto'
import { prisma } from '../../shared/prisma.js'
import { registrarAuditoria } from '../../audit/audit.service.js'
import { validarArchivo, TIPOS_ORIGEN_VALIDOS } from './cargas.validacionArchivo.js'
import { calcularHash, guardarArchivo, leerArchivo } from './cargas.storage.js'
import { procesarArchivo } from '../../document-processing/procesamiento.service.js'

class CargaError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.status = status
  }
}

function serializarArchivo(archivo, extra = {}) {
  return {
    id: archivo.id,
    nombreOriginal: archivo.nombreOriginal,
    extension: archivo.extension,
    tamanoBytes: Number(archivo.tamanoBytes),
    estado: archivo.estado,
    mensajeError: archivo.mensajeError,
    ...extra,
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
    // Ningún archivo individual debe poder tumbar el resto del lote ni dejar
    // la carga atascada en PROCESANDO — si algo inesperado revienta aquí
    // (I/O, DB, un parser con un bug), se reporta ese archivo como fallido y
    // se sigue con los demás (bug real encontrado: una excepción sin atrapar
    // en el parser de CSV abortaba toda la petición a mitad de camino).
    let archivoId = null
    try {
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

      archivoId = randomUUID()
      const rutaAlmacenamiento = await guardarArchivo({
        empresaId,
        cargaId: carga.id,
        archivoId,
        extension: validacion.extension,
        buffer: archivo.buffer,
      })

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
      })

      // Sin cola/worker en esta fase: se procesa en el mismo request, igual que
      // la validación de contenido (ver docs/data-flow.md — RECIBIDO → PROCESANDO → PROCESADO/ERROR).
      // `procesarArchivo` ya nunca lanza (ver procesamiento.service.js), pero
      // igual queda cubierto por el try/catch de este bloque como red adicional.
      const { exito, documentosCreados, erroresFilas } = await procesarArchivo({
        empresaId,
        archivoOrigenId: archivoId,
        tipoOrigen,
        buffer: archivo.buffer,
      })

      const mensajeError = !exito
        ? erroresFilas.map((e) => (e.fila ? `Fila ${e.fila}: ${e.errores.join('; ')}` : e.errores.join('; '))).join(' | ')
        : erroresFilas.length > 0
          ? `${erroresFilas.length} fila(s) omitidas por errores (ver detalle en /documentos)`
          : null

      const archivoActualizado = await prisma.archivoOrigen.update({
        where: { id: archivoId },
        data: { estado: exito ? 'PROCESADO' : 'ERROR', mensajeError: mensajeError?.slice(0, 1000) },
      })

      resultados.push(serializarArchivo(archivoActualizado, { documentosCreados: documentosCreados.length }))
    } catch (error) {
      console.error(`Error inesperado procesando "${archivo.originalname}":`, error)
      const mensaje = `Error inesperado al procesar el archivo: ${error.message}`

      if (archivoId) {
        // Ya se había creado la fila (el fallo ocurrió después, ej. en el
        // update final) — se marca ERROR en vez de fingir que nunca se guardó.
        try {
          const archivoActualizado = await prisma.archivoOrigen.update({
            where: { id: archivoId },
            data: { estado: 'ERROR', mensajeError: mensaje.slice(0, 1000) },
          })
          resultados.push(serializarArchivo(archivoActualizado, { documentosCreados: 0 }))
          continue
        } catch {
          // Ni siquiera se pudo marcar como ERROR (ej. la BD no responde);
          // se reporta igual en la respuesta aunque quede inconsistente en BD.
        }
      }

      resultados.push(archivoRechazado(archivo.originalname, mensaje))
    }
  }

  const cantidadAceptados = resultados.filter((r) => r.estado === 'PROCESADO').length
  const cargaFinal = await prisma.carga.update({
    where: { id: carga.id },
    data: { estado: cantidadAceptados > 0 ? 'PROCESADO' : 'ERROR', finalizadoEn: new Date() },
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
  // Todo archivo_origen persistido tiene contenido en disco (los rechazados
  // en la validación de Fase 6 nunca llegan a crear fila) — un estado ERROR
  // aquí significa que falló el procesamiento (Fase 7), no que falte el archivo.
  const archivo = await prisma.archivoOrigen.findFirst({ where: { id: archivoId, cargaId, empresaId } })
  if (!archivo) throw new CargaError('Archivo no encontrado', 404)
  const buffer = await leerArchivo(archivo.rutaAlmacenamiento)
  return { buffer, nombreOriginal: archivo.nombreOriginal, extension: archivo.extension }
}

export { CargaError }
