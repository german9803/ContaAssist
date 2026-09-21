import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parsearExtractoCsv, parsearExtractoXlsx } from '../src/modules/bancos/extractoParser.js'
import ExcelJS from 'exceljs'

test('parsearExtractoCsv acepta una línea de débito válida', () => {
  const csv = ['fecha,descripcion,debito,credito', '2026-09-01,Pago a proveedor,50000,'].join('\n')
  const [linea] = parsearExtractoCsv(Buffer.from(csv, 'utf-8'))
  assert.equal(linea.valido, true)
  assert.equal(linea.debito, 50000)
  assert.equal(linea.credito, 0)
  assert.equal(linea.descripcion, 'Pago a proveedor')
})

test('parsearExtractoCsv acepta una línea de crédito válida', () => {
  const csv = ['fecha,descripcion,debito,credito', '2026-09-02,Consignación cliente,,120000'].join('\n')
  const [linea] = parsearExtractoCsv(Buffer.from(csv, 'utf-8'))
  assert.equal(linea.valido, true)
  assert.equal(linea.credito, 120000)
  assert.equal(linea.debito, 0)
})

test('parsearExtractoCsv rechaza una línea con débito y crédito a la vez', () => {
  const csv = ['fecha,descripcion,debito,credito', '2026-09-01,Ambiguo,1000,1000'].join('\n')
  const [linea] = parsearExtractoCsv(Buffer.from(csv, 'utf-8'))
  assert.equal(linea.valido, false)
  assert.match(linea.errores.join(), /no puede tener débito y crédito/)
})

test('parsearExtractoCsv rechaza una línea sin débito ni crédito', () => {
  const csv = ['fecha,descripcion,debito,credito', '2026-09-01,Sin movimiento,,'].join('\n')
  const [linea] = parsearExtractoCsv(Buffer.from(csv, 'utf-8'))
  assert.equal(linea.valido, false)
  assert.match(linea.errores.join(), /débito o crédito mayor a 0/)
})

test('parsearExtractoCsv reporta fecha inválida sin descartar otras filas', () => {
  const csv = [
    'fecha,descripcion,debito,credito',
    'no-es-fecha,Malo,1000,',
    '2026-09-01,Bueno,,2000',
  ].join('\n')
  const filas = parsearExtractoCsv(Buffer.from(csv, 'utf-8'))
  assert.equal(filas[0].valido, false)
  assert.equal(filas[1].valido, true)
})

test('parsearExtractoCsv nunca lanza: contenido irrecuperable devuelve fila inválida', () => {
  const filas = parsearExtractoCsv(Buffer.from('"sin cerrar\ny basura'))
  assert.equal(Array.isArray(filas), true)
  assert.equal(filas[0].valido, false)
})

test('parsearExtractoXlsx interpreta un archivo real generado con ExcelJS', async () => {
  const workbook = new ExcelJS.Workbook()
  const hoja = workbook.addWorksheet('Extracto')
  hoja.addRow(['fecha', 'descripcion', 'debito', 'credito'])
  hoja.addRow(['2026-09-05', 'Retiro cajero', 80000, ''])
  const buffer = Buffer.from(await workbook.xlsx.writeBuffer())

  const [linea] = await parsearExtractoXlsx(buffer)
  assert.equal(linea.valido, true)
  assert.equal(linea.debito, 80000)
  assert.equal(linea.descripcion, 'Retiro cajero')
})
