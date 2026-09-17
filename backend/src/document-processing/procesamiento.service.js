import { prisma } from '../shared/prisma.js'
import { buscarOCrearTercero } from './terceros.interno.js'
import { parsearCsv } from './csvParser.js'
import { parsearXlsx } from './xlsxParser.js'
import { parsearXmlFactura } from './xmlParser.js'
import { extraerTextoPdf } from './pdfParser.js'

async function idImpuesto(codigo, cache) {
  if (!codigo) return null
  if (cache.has(codigo)) return cache.get(codigo)
  const impuesto = await prisma.impuesto.findUnique({ where: { codigo } })
  cache.set(codigo, impuesto?.id ?? null)
  return impuesto?.id ?? null
}

async function crearDocumentoDesdeBorrador({ empresaId, archivoOrigenId, borrador, cacheImpuestos }) {
  const tercero = await buscarOCrearTercero({
    empresaId,
    nit: borrador.nit,
    razonSocial: borrador.razonSocialTercero,
  })

  const documento = await prisma.documento.create({
    data: {
      empresaId,
      archivoOrigenId,
      tipoDocumento: borrador.tipoDocumento,
      numeroDocumento: borrador.numeroDocumento,
      prefijo: borrador.prefijo,
      fechaEmision: borrador.fechaEmision,
      terceroId: tercero.id,
      subtotal: borrador.subtotal,
      totalImpuestos: borrador.iva || 0,
      total: borrador.total,
      estado: 'PROCESADO',
    },
  })

  if (borrador.iva > 0 && borrador.codigoImpuestoIva) {
    const impuestoId = await idImpuesto(borrador.codigoImpuestoIva, cacheImpuestos)
    if (impuestoId) {
      await prisma.documentoImpuesto.create({
        data: { documentoId: documento.id, impuestoId, base: borrador.subtotal ?? 0, valor: borrador.iva },
      })
    }
  }

  return documento
}

async function crearDocumentoShell({ empresaId, archivoOrigenId, observaciones, textoExtraido }) {
  return prisma.documento.create({
    data: {
      empresaId,
      archivoOrigenId,
      tipoDocumento: 'OTRO',
      estado: 'PROCESADO',
      observaciones,
      textoExtraido,
    },
  })
}

// Punto de entrada del motor de procesamiento (Fase 7). Toma un archivo ya
// almacenado por el Centro de Carga (Fase 6) y produce Documento(s). NO valida
// reglas de negocio (duplicados, totales cuadrados, etc.) — eso es el
// validation-engine de Fase 8. Aquí solo se extrae y normaliza.
//
// Nunca debe lanzar: un archivo con contenido inesperado (CSV mal formado,
// XLSX corrupto, etc.) es un resultado de procesamiento fallido, no una
// excepción — si esto lanzara, dejaría la carga y el archivo_origen
// atascados en estado PROCESANDO para siempre (bug real encontrado y
// corregido durante las pruebas: un CSV real con una línea de comentario
// tumbaba `csv-parse` y crasheaba toda la petición).
export async function procesarArchivo({ empresaId, archivoOrigenId, tipoOrigen, buffer }) {
  try {
    return await despacharPorTipo({ empresaId, archivoOrigenId, tipoOrigen, buffer })
  } catch (error) {
    return {
      exito: false,
      documentosCreados: [],
      erroresFilas: [{ fila: null, errores: [`No se pudo procesar el archivo: ${error.message}`] }],
    }
  }
}

async function despacharPorTipo({ empresaId, archivoOrigenId, tipoOrigen, buffer }) {
  const cacheImpuestos = new Map()
  const documentosCreados = []
  const erroresFilas = []

  if (tipoOrigen === 'CSV' || tipoOrigen === 'XLSX') {
    const borradores = tipoOrigen === 'CSV' ? parsearCsv(buffer) : await parsearXlsx(buffer)

    for (const borrador of borradores) {
      if (!borrador.valido) {
        erroresFilas.push({ fila: borrador.fila, errores: borrador.errores })
        continue
      }
      documentosCreados.push(await crearDocumentoDesdeBorrador({ empresaId, archivoOrigenId, borrador, cacheImpuestos }))
    }

    if (documentosCreados.length === 0) {
      return { exito: false, documentosCreados, erroresFilas }
    }
    return { exito: true, documentosCreados, erroresFilas }
  }

  if (tipoOrigen === 'XML') {
    const borrador = parsearXmlFactura(buffer)
    if (!borrador.valido) {
      return { exito: false, documentosCreados: [], erroresFilas: [{ fila: null, errores: borrador.errores }] }
    }
    documentosCreados.push(await crearDocumentoDesdeBorrador({ empresaId, archivoOrigenId, borrador, cacheImpuestos }))
    return { exito: true, documentosCreados, erroresFilas: [] }
  }

  if (tipoOrigen === 'PDF') {
    const { texto, error } = await extraerTextoPdf(buffer)
    if (error) {
      return { exito: false, documentosCreados: [], erroresFilas: [{ fila: null, errores: [`No se pudo leer el PDF: ${error}`] }] }
    }
    documentosCreados.push(
      await crearDocumentoShell({
        empresaId,
        archivoOrigenId,
        textoExtraido: texto,
        observaciones: texto
          ? 'Texto extraído automáticamente del PDF. Completa los campos contables manualmente (sin OCR/IA en esta fase).'
          : 'El PDF no tiene texto extraíble (probablemente es una imagen escaneada). Completa los campos manualmente.',
      }),
    )
    return { exito: true, documentosCreados, erroresFilas: [] }
  }

  if (tipoOrigen === 'JPG' || tipoOrigen === 'PNG') {
    documentosCreados.push(
      await crearDocumentoShell({
        empresaId,
        archivoOrigenId,
        observaciones: 'Imagen recibida. La extracción automática de datos requiere OCR (Fase 16) — completa los campos manualmente.',
      }),
    )
    return { exito: true, documentosCreados, erroresFilas: [] }
  }

  if (tipoOrigen === 'XLS') {
    documentosCreados.push(
      await crearDocumentoShell({
        empresaId,
        archivoOrigenId,
        observaciones:
          'El formato .xls (Excel 97-2003) todavía no se puede leer automáticamente. Vuelve a guardar el archivo como .xlsx o .csv, o completa los campos manualmente.',
      }),
    )
    return { exito: true, documentosCreados, erroresFilas: [] }
  }

  return { exito: false, documentosCreados: [], erroresFilas: [{ fila: null, errores: [`Tipo de origen no soportado: ${tipoOrigen}`] }] }
}
