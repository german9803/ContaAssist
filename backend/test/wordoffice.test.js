import { test } from 'node:test'
import assert from 'node:assert/strict'
import ExcelJS from 'exceljs'
import { COLUMNAS_COMPRAS, COLUMNAS_VENTAS, validarPrerequisitosWordOffice, transformarWordOffice } from '../src/adapters/wordoffice/mapper.js'
import { adaptadorWordOffice, AdaptadorWordOfficeError } from '../src/adapters/wordoffice/adapter.js'

const MAPEOS = {
  terceros: new Map([['tercero-1', '900231070']]),
  formasPago: new Map([['forma-1', 'Credito']]),
  productos: new Map([['producto-1', '117']]),
  bodegas: new Map([['bodega-1', 'Matadero']]),
}

const LINEA_COMPLETA = {
  productoId: 'producto-1',
  bodegaId: 'bodega-1',
  cantidad: 35,
  valorUnitario: 24000,
  porcentajeIva: 0,
  descuento: 0,
  producto: { unidadMedida: 'Und.' },
  centroCosto: null,
}

const DOCUMENTO_COMPRA = {
  id: 'doc-1',
  tipoDocumento: 'FACTURA_COMPRA',
  prefijo: 'SETP',
  numeroDocumento: '990000099',
  fechaEmision: new Date('2026-08-24'),
  fechaVencimiento: null,
  terceroId: 'tercero-1',
  formaPagoId: 'forma-1',
  observaciones: null,
  empresa: { razonSocial: 'EL CASTILLO DEL CERDO PC SAN MARTIN SAS' },
  tercero: { identificacion: '900231070' },
  detalles: [LINEA_COMPLETA],
}

const DOCUMENTO_VENTA = {
  ...DOCUMENTO_COMPRA,
  id: 'doc-2',
  tipoDocumento: 'FACTURA_VENTA',
  prefijo: 'POST',
  numeroDocumento: '49201',
}

test('validarPrerequisitosWordOffice no reporta errores con tercero/formaPago/línea completos', () => {
  assert.deepEqual(validarPrerequisitosWordOffice([DOCUMENTO_COMPRA], MAPEOS), [])
})

test('validarPrerequisitosWordOffice exige al menos una línea de detalle', () => {
  const documento = { ...DOCUMENTO_COMPRA, detalles: [] }
  const errores = validarPrerequisitosWordOffice([documento], MAPEOS)
  assert.equal(errores.length, 1)
  assert.match(errores[0].mensaje, /no tiene líneas de producto/)
})

test('validarPrerequisitosWordOffice reporta línea sin bodega mapeada', () => {
  const documento = { ...DOCUMENTO_COMPRA, detalles: [{ ...LINEA_COMPLETA, bodegaId: 'bodega-sin-mapeo' }] }
  const errores = validarPrerequisitosWordOffice([documento], MAPEOS)
  assert.equal(errores.length, 1)
  assert.match(errores[0].mensaje, /bodega no tiene mapeo/)
})

test('validarPrerequisitosWordOffice NO exige cuenta contable de cabecera (WordOffice la resuelve desde el producto)', () => {
  const documento = { ...DOCUMENTO_COMPRA, cuentaContableId: null }
  assert.deepEqual(validarPrerequisitosWordOffice([documento], MAPEOS), [])
})

test('transformarWordOffice: compras deja Documento Número vacío y usa Pref/No Dto Ext para el número real del proveedor', () => {
  const [registro] = transformarWordOffice([DOCUMENTO_COMPRA], MAPEOS)
  assert.equal(registro.tipoDocumento, 'FC')
  assert.equal(registro.documentoNumero, '')
  assert.equal(registro.prefDtoExt, 'SETP')
  assert.equal(registro.noDtoExt, '990000099')
  assert.equal(registro.producto, '117')
  assert.equal(registro.bodega, 'Matadero')
})

test('transformarWordOffice: ventas usa Documento Número real y deja vacíos los campos de documento externo', () => {
  const [registro] = transformarWordOffice([DOCUMENTO_VENTA], MAPEOS)
  assert.equal(registro.tipoDocumento, 'FV')
  assert.equal(registro.documentoNumero, '49201')
  assert.equal(registro.prefDtoExt, '')
  assert.equal(registro.noDtoExt, '')
})

test('transformarWordOffice produce una fila por línea de detalle, no por documento', () => {
  const documento = { ...DOCUMENTO_COMPRA, detalles: [LINEA_COMPLETA, { ...LINEA_COMPLETA, cantidad: 1 }] }
  const registros = transformarWordOffice([documento], MAPEOS)
  assert.equal(registros.length, 2)
})

test('adaptadorWordOffice.generarArchivo exige terceroInterno', async () => {
  const registros = transformarWordOffice([DOCUMENTO_COMPRA], MAPEOS)
  await assert.rejects(() => adaptadorWordOffice.generarArchivo(registros, {}), AdaptadorWordOfficeError)
})

test('adaptadorWordOffice.generarArchivo (compras) escribe exactamente las 58 columnas reales, en orden', async () => {
  const registros = transformarWordOffice([DOCUMENTO_COMPRA], MAPEOS)
  const buffer = await adaptadorWordOffice.generarArchivo(registros, { terceroInterno: 1019103885 })

  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)
  const hoja = workbook.worksheets[0]

  const encabezados = hoja.getRow(1).values.slice(1)
  assert.deepEqual(encabezados, COLUMNAS_COMPRAS.map((c) => c.encabezado))

  const fila = hoja.getRow(2).values.slice(1)
  assert.equal(fila[0], 'EL CASTILLO DEL CERDO PC SAN MARTIN SAS') // Encab: Empresa
  assert.equal(fila[1], 'FC') // Encab: Tipo Documento
  assert.equal(fila[3], '') // Encab: Documento Número — vacío en compras
  assert.equal(fila[5], 1019103885) // Encab: Tercero Interno
  assert.equal(fila[7], 'SETP') // Encab: Pref Dto Ext
  assert.equal(fila[8], '990000099') // Encab: No. Dto Ext
  assert.equal(fila[32], '117') // Detalle: Producto
  assert.equal(fila[33], 'Matadero') // Detalle: Bodega
})

test('adaptadorWordOffice.generarArchivo (ventas) usa el layout de 57 columnas', async () => {
  const registros = transformarWordOffice([DOCUMENTO_VENTA], MAPEOS)
  const buffer = await adaptadorWordOffice.generarArchivo(registros, { terceroInterno: 1057489487 })

  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)
  const hoja = workbook.worksheets[0]

  const encabezados = hoja.getRow(1).values.slice(1)
  assert.deepEqual(encabezados, COLUMNAS_VENTAS.map((c) => c.encabezado))
  assert.equal(encabezados.length, 57)

  const fila = hoja.getRow(2).values.slice(1)
  assert.equal(fila[3], '49201') // Encab: Documento Número — sí es real en ventas
})
