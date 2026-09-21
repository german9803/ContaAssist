import ExcelJS from 'exceljs'
import { COLUMNAS, validarPrerequisitosContaAssist, transformarContaAssist } from '../formatoContaAssist.js'

export const adaptadorExcel = {
  codigo: 'EXCEL',
  versionFormato: '1.0',
  extension: 'xlsx',
  validarPrerequisitos: validarPrerequisitosContaAssist,
  transformar: transformarContaAssist,

  async generarArchivo(registros) {
    const workbook = new ExcelJS.Workbook()
    const hoja = workbook.addWorksheet('Exportación')
    hoja.addRow(COLUMNAS.map((c) => c.encabezado))
    for (const registro of registros) {
      hoja.addRow(COLUMNAS.map((c) => registro[c.clave]))
    }
    return Buffer.from(await workbook.xlsx.writeBuffer())
  },
}
