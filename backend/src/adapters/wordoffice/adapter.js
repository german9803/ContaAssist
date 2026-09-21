import ExcelJS from 'exceljs'
import { COLUMNAS_COMPRAS, COLUMNAS_VENTAS, validarPrerequisitosWordOffice, transformarWordOffice } from './mapper.js'

export class AdaptadorWordOfficeError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.status = status
  }
}

export const adaptadorWordOffice = {
  codigo: 'WORDOFFICE',
  versionFormato: '1.0',
  extension: 'xlsx',
  validarPrerequisitos: validarPrerequisitosWordOffice,
  transformar: transformarWordOffice,

  // A diferencia de EXCEL/CSV (Fase 13), WordOffice necesita parámetros que no
  // están en ningún documento: `terceroInterno` es obligatorio (usuario/serie
  // interna de WordOffice — constante por lote, ver README.md), `notaLinea`/
  // `centroCostosTexto` son opcionales (constantes de lote observadas en los
  // archivos reales, ej. "Interface Tecno Carnes", "PC SAN MARTIN SAS").
  async generarArchivo(registros, parametros = {}) {
    if (!parametros.terceroInterno) {
      throw new AdaptadorWordOfficeError('WordOffice requiere "terceroInterno" (usuario/serie interna) para generar el archivo')
    }
    if (registros.length === 0) {
      throw new AdaptadorWordOfficeError('No hay líneas para generar el archivo de WordOffice')
    }

    const esCompra = registros[0].tipoDocumentoInterno === 'FACTURA_COMPRA'
    const columnas = esCompra ? COLUMNAS_COMPRAS : COLUMNAS_VENTAS

    const valores = {
      terceroInterno: parametros.terceroInterno,
      notaLinea: parametros.notaLinea || '',
      centroCostosTexto: parametros.centroCostosTexto || '',
      vacio: '',
    }

    const workbook = new ExcelJS.Workbook()
    const hoja = workbook.addWorksheet(esCompra ? 'Encab +Movimi. Inventa' : 'Encab +Movimi. Inventa')
    hoja.addRow(columnas.map((c) => c.encabezado))
    for (const registro of registros) {
      hoja.addRow(columnas.map((c) => registro[c.clave] ?? valores[c.clave] ?? ''))
    }

    return Buffer.from(await workbook.xlsx.writeBuffer())
  },
}
