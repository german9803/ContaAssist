import { parse } from 'csv-parse/sync'
import ExcelJS from 'exceljs'

// Plantilla propia de ContaAssist para extractos bancarios (no es el formato
// de ningún banco — cada banco tiene el suyo, y no hay uno único que
// "adivinar" sin arriesgarse a leer mal los datos; igual que la plantilla
// CSV/XLSX de documentos de Fase 7, se define una propia). Columnas: fecha,
// descripcion, debito, credito — una de las dos últimas es 0/vacía por fila.
export const COLUMNAS_EXTRACTO = ['fecha', 'descripcion', 'debito', 'credito']

function normalizarEncabezado(encabezado) {
  return String(encabezado || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '_')
}

function aDecimal(valor) {
  if (valor === undefined || valor === null || valor === '') return 0
  const num = Number(String(valor).replace(',', '.'))
  return Number.isFinite(num) ? num : null
}

function aFecha(valor) {
  if (!valor) return null
  const fecha = new Date(valor)
  return Number.isNaN(fecha.getTime()) ? null : fecha
}

function interpretarFilasExtracto(filas) {
  return filas.map((filaOriginal, indice) => {
    const fila = {}
    for (const [clave, valor] of Object.entries(filaOriginal)) {
      fila[normalizarEncabezado(clave)] = typeof valor === 'string' ? valor.trim() : valor
    }

    const errores = []
    const fecha = aFecha(fila.fecha)
    if (!fecha) errores.push('fecha inválida o ausente (usar AAAA-MM-DD)')
    if (!fila.descripcion) errores.push('descripcion es requerida')

    const debito = aDecimal(fila.debito)
    const credito = aDecimal(fila.credito)
    if (debito === null) errores.push('debito inválido')
    if (credito === null) errores.push('credito inválido')
    if (debito > 0 && credito > 0) errores.push('una línea no puede tener débito y crédito a la vez')
    if (!debito && !credito) errores.push('la línea debe tener débito o crédito mayor a 0')

    return {
      fila: indice + 2, // +2: fila 1 es el encabezado, filas 1-indexadas para el usuario
      valido: errores.length === 0,
      errores,
      fecha,
      descripcion: fila.descripcion ? String(fila.descripcion) : null,
      debito: debito || 0,
      credito: credito || 0,
    }
  })
}

// Nunca lanza (mismo criterio que csvParser.js/xlsxParser.js de Fase 7): un
// archivo corrupto es un resultado de importación fallido, no una excepción.
export function parsearExtractoCsv(buffer) {
  try {
    const registros = parse(buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
      comment: '#',
    })
    return interpretarFilasExtracto(registros)
  } catch (error) {
    return [{ fila: null, valido: false, errores: [`Archivo CSV inválido o corrupto: ${error.message}`] }]
  }
}

export async function parsearExtractoXlsx(buffer) {
  try {
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const hoja = workbook.worksheets[0]
    if (!hoja) return [{ fila: null, valido: false, errores: ['El archivo no tiene ninguna hoja'] }]

    const encabezados = hoja.getRow(1).values.slice(1).map((v) => String(v ?? ''))
    const registros = []
    hoja.eachRow((row, numero) => {
      if (numero === 1) return
      const valores = row.values.slice(1)
      if (valores.every((v) => v === null || v === undefined || v === '')) return
      const registro = {}
      encabezados.forEach((encabezado, i) => {
        let valor = valores[i]
        if (valor instanceof Date) valor = valor.toISOString().slice(0, 10)
        registro[encabezado] = valor
      })
      registros.push(registro)
    })
    return interpretarFilasExtracto(registros)
  } catch (error) {
    return [{ fila: null, valido: false, errores: [`Archivo XLSX inválido o corrupto: ${error.message}`] }]
  }
}
