import { test } from 'node:test'
import assert from 'node:assert/strict'
import ExcelJS from 'exceljs'
import { validarPrerequisitosContaAssist, transformarContaAssist, COLUMNAS } from '../src/adapters/formatoContaAssist.js'
import { adaptadorExcel } from '../src/adapters/excel/adapter.js'
import { adaptadorCsv } from '../src/adapters/csv/adapter.js'
import { TIPOS_DOCUMENTO_POR_INFORMACION } from '../src/export-engine/exportEngine.js'

const MAPEOS_COMPLETOS = {
  terceros: new Map([['tercero-1', 'T1']]),
  cuentas: new Map([['cuenta-1', 'C1']]),
  formasPago: new Map([['forma-1', 'F1']]),
}

const DOCUMENTO_COMPLETO = {
  id: 'doc-1',
  tipoDocumento: 'FACTURA_COMPRA',
  prefijo: 'FC',
  numeroDocumento: '100',
  fechaEmision: new Date('2026-01-15'),
  terceroId: 'tercero-1',
  cuentaContableId: 'cuenta-1',
  centroCostoId: null,
  formaPagoId: 'forma-1',
  subtotal: 100000,
  totalImpuestos: 19000,
  total: 119000,
  tercero: { identificacion: '900123456', razonSocial: 'Proveedor SAS' },
  cuentaContable: { codigo: '5195' },
  centroCosto: null,
}

test('validarPrerequisitosContaAssist no reporta errores cuando tercero/cuenta/forma de pago están asignados y mapeados', () => {
  const errores = validarPrerequisitosContaAssist([DOCUMENTO_COMPLETO], MAPEOS_COMPLETOS)
  assert.deepEqual(errores, [])
})

test('validarPrerequisitosContaAssist reporta cuenta sin asignar y forma de pago sin mapeo', () => {
  const documento = { ...DOCUMENTO_COMPLETO, cuentaContableId: null, formaPagoId: 'forma-sin-mapeo' }
  const errores = validarPrerequisitosContaAssist([documento], MAPEOS_COMPLETOS)
  assert.equal(errores.length, 2)
  assert.match(errores[0].mensaje, /cuenta contable asignada/)
  assert.match(errores[1].mensaje, /forma de pago del documento no tiene mapeo/)
})

test('transformarContaAssist resuelve los códigos destino desde el mapeo', () => {
  const [registro] = transformarContaAssist([DOCUMENTO_COMPLETO], MAPEOS_COMPLETOS)
  assert.equal(registro.terceroCodigoDestino, 'T1')
  assert.equal(registro.cuentaCodigoDestino, 'C1')
  assert.equal(registro.formaPagoCodigoDestino, 'F1')
  assert.equal(registro.total, 119000)
  assert.equal(registro.fechaEmision, '2026-01-15')
})

test('adaptadorCsv.generarArchivo produce encabezado + una fila delimitada por comas', () => {
  const registros = transformarContaAssist([DOCUMENTO_COMPLETO], MAPEOS_COMPLETOS)
  const buffer = adaptadorCsv.generarArchivo(registros)
  const texto = buffer.toString('utf-8')
  const [encabezado, fila] = texto.split('\r\n')
  assert.equal(encabezado, COLUMNAS.map((c) => c.encabezado).join(','))
  assert.match(fila, /Proveedor SAS/)
  assert.match(fila, /119000/)
})

test('adaptadorCsv.generarArchivo encierra en comillas un campo con coma', () => {
  const documento = { ...DOCUMENTO_COMPLETO, tercero: { ...DOCUMENTO_COMPLETO.tercero, razonSocial: 'Proveedor, SAS' } }
  const registros = transformarContaAssist([documento], MAPEOS_COMPLETOS)
  const texto = adaptadorCsv.generarArchivo(registros).toString('utf-8')
  assert.match(texto, /"Proveedor, SAS"/)
})

test('adaptadorExcel.generarArchivo produce un .xlsx legible con la misma fila', async () => {
  const registros = transformarContaAssist([DOCUMENTO_COMPLETO], MAPEOS_COMPLETOS)
  const buffer = await adaptadorExcel.generarArchivo(registros)

  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)
  const hoja = workbook.worksheets[0]
  assert.equal(hoja.getRow(1).getCell(1).value, COLUMNAS[0].encabezado)
  assert.equal(hoja.getRow(2).getCell(6).value, 'Proveedor SAS')
})

test('TIPOS_DOCUMENTO_POR_INFORMACION solo cubre COMPRAS/VENTAS (BANCOS llega en Fase 15)', () => {
  assert.deepEqual(Object.keys(TIPOS_DOCUMENTO_POR_INFORMACION).sort(), ['COMPRAS', 'VENTAS'])
})
