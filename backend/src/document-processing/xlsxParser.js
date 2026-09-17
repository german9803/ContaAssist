import ExcelJS from 'exceljs'
import { interpretarFilas } from './plantillaTabular.js'

export async function parsearXlsx(buffer) {
  try {
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const hoja = workbook.worksheets[0]
    if (!hoja) {
      return [{ fila: null, valido: false, errores: ['El archivo Excel no tiene ninguna hoja con datos'] }]
    }

    const encabezados = []
    hoja.getRow(1).eachCell((celda, columna) => {
      encabezados[columna] = String(celda.value ?? '').trim()
    })

    const registros = []
    hoja.eachRow((fila, numeroFila) => {
      if (numeroFila === 1) return
      const registro = {}
      let tieneContenido = false
      fila.eachCell({ includeEmpty: true }, (celda, columna) => {
        const encabezado = encabezados[columna]
        if (!encabezado) return
        const valor = celda.value && celda.value.text !== undefined ? celda.value.text : celda.value
        if (valor !== null && valor !== undefined && valor !== '') tieneContenido = true
        registro[encabezado] = valor instanceof Date ? valor.toISOString().slice(0, 10) : valor
      })
      if (tieneContenido) registros.push(registro)
    })

    return interpretarFilas(registros)
  } catch (error) {
    // Un archivo .xlsx corrupto o mal formado no debe lanzar — mismo formato
    // de "fila" fallida que produce interpretarFilas, sin caso especial aguas arriba.
    return [{ fila: null, valido: false, errores: [`Archivo Excel inválido o corrupto: ${error.message}`] }]
  }
}
