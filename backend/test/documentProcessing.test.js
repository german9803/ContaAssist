import { test } from 'node:test'
import assert from 'node:assert/strict'
import { interpretarFilas } from '../src/document-processing/plantillaTabular.js'
import { parsearCsv } from '../src/document-processing/csvParser.js'
import { parsearXmlFactura } from '../src/document-processing/xmlParser.js'

test('interpretarFilas acepta una fila completa y válida', () => {
  const [fila] = interpretarFilas([
    {
      tipo_documento: 'factura_compra',
      numero_documento: 'FC-001',
      fecha_emision: '2026-09-01',
      nit_tercero: '900123456',
      razon_social_tercero: 'Proveedor Demo SAS',
      subtotal: '100000',
      iva: '19000',
      porcentaje_iva: '19',
      total: '119000',
    },
  ])
  assert.equal(fila.valido, true)
  assert.equal(fila.tipoDocumento, 'FACTURA_COMPRA')
  assert.equal(fila.codigoImpuestoIva, 'IVA_19')
  assert.equal(fila.total, 119000)
})

test('interpretarFilas reporta errores por campos faltantes sin descartar otras filas', () => {
  const filas = interpretarFilas([
    { tipo_documento: 'FACTURA_COMPRA', numero_documento: '', fecha_emision: '2026-09-01', nit_tercero: '1', razon_social_tercero: 'X', subtotal: '1', total: '1' },
    { tipo_documento: 'FACTURA_COMPRA', numero_documento: 'FC-002', fecha_emision: '2026-09-01', nit_tercero: '1', razon_social_tercero: 'X', subtotal: '1', total: '1' },
  ])
  assert.equal(filas[0].valido, false)
  assert.match(filas[0].errores.join(), /numero_documento/)
  assert.equal(filas[1].valido, true)
})

// Fase 14: columnas de línea opcionales. Varias filas con el mismo
// tipo+numero+nit se agrupan en un solo documento con varias líneas.
test('interpretarFilas agrupa varias filas del mismo documento en líneas', () => {
  const base = {
    tipo_documento: 'FACTURA_COMPRA',
    numero_documento: 'FC-500',
    fecha_emision: '2026-09-01',
    nit_tercero: '900123456',
    razon_social_tercero: 'Proveedor Demo SAS',
    subtotal: '150000',
    total: '150000',
  }
  const [documento] = interpretarFilas([
    { ...base, producto_descripcion: 'Lomo', cantidad: '10', valor_unitario: '5000' },
    { ...base, producto_descripcion: 'Costilla', cantidad: '2', valor_unitario: '50000' },
  ])
  assert.equal(documento.valido, true)
  assert.equal(documento.lineas.length, 2)
  assert.equal(documento.lineas[0].descripcion, 'Lomo')
  assert.equal(documento.lineas[0].subtotalLinea, 50000)
  assert.equal(documento.lineas[1].descripcion, 'Costilla')
})

test('interpretarFilas no agrupa filas sin numero_documento (evita mezclar filas inválidas)', () => {
  const documentos = interpretarFilas([
    { tipo_documento: 'FACTURA_COMPRA', numero_documento: '', nit_tercero: '1' },
    { tipo_documento: 'FACTURA_COMPRA', numero_documento: '', nit_tercero: '1' },
  ])
  assert.equal(documentos.length, 2)
})

test('interpretarFilas sin columnas de línea se comporta igual que antes (sin lineas)', () => {
  const [documento] = interpretarFilas([
    {
      tipo_documento: 'FACTURA_COMPRA',
      numero_documento: 'FC-501',
      fecha_emision: '2026-09-01',
      nit_tercero: '1',
      razon_social_tercero: 'X',
      subtotal: '1',
      total: '1',
    },
  ])
  assert.deepEqual(documento.lineas, [])
})

test('interpretarFilas rechaza un porcentaje de IVA no reconocido', () => {
  const [fila] = interpretarFilas([
    { tipo_documento: 'FACTURA_COMPRA', numero_documento: 'FC-003', fecha_emision: '2026-09-01', nit_tercero: '1', razon_social_tercero: 'X', subtotal: '100', iva: '7', porcentaje_iva: '7', total: '107' },
  ])
  assert.equal(fila.valido, false)
  assert.match(fila.errores.join(), /porcentaje_iva/)
})

test('parsearCsv interpreta un CSV real con encabezados', () => {
  const csv = [
    'tipo_documento,numero_documento,fecha_emision,nit_tercero,razon_social_tercero,subtotal,iva,porcentaje_iva,total',
    'FACTURA_COMPRA,FC-100,2026-09-01,900999888,Proveedor SAS,50000,9500,19,59500',
  ].join('\n')
  const [fila] = parsearCsv(Buffer.from(csv, 'utf-8'))
  assert.equal(fila.valido, true)
  assert.equal(fila.numeroDocumento, 'FC-100')
  assert.equal(fila.total, 59500)
})

const XML_FACTURA_DEMO = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:ID>SETP990000001</cbc:ID>
  <cbc:IssueDate>2026-09-10</cbc:IssueDate>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>Proveedor Demo SAS</cbc:RegistrationName>
      </cac:PartyLegalEntity>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>900123456</cbc:CompanyID>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:TaxTotal>
    <cbc:TaxAmount>19000</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cac:TaxCategory>
        <cbc:Percent>19.00</cbc:Percent>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount>100000</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount>100000</cbc:TaxExclusiveAmount>
    <cbc:PayableAmount>119000</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
</Invoice>`

test('parsearXmlFactura extrae los campos de una factura UBL válida', () => {
  const resultado = parsearXmlFactura(Buffer.from(XML_FACTURA_DEMO, 'utf-8'))
  assert.equal(resultado.valido, true)
  assert.equal(resultado.numeroDocumento, 'SETP990000001')
  assert.equal(resultado.nit, '900123456')
  assert.equal(resultado.razonSocialTercero, 'Proveedor Demo SAS')
  assert.equal(resultado.subtotal, 100000)
  assert.equal(resultado.total, 119000)
  assert.equal(resultado.iva, 19000)
  assert.equal(resultado.codigoImpuestoIva, 'IVA_19')
})

test('parsearXmlFactura reporta error en un XML sin <Invoice>', () => {
  const resultado = parsearXmlFactura(Buffer.from('<algo><otraCosa/></algo>', 'utf-8'))
  assert.equal(resultado.valido, false)
  assert.ok(resultado.errores.length > 0)
})

// Regresión: un CSV real de sample-files.com con una línea de comentario y
// columnas que no coinciden con la plantilla tumbaba `csv-parse` con una
// excepción sin atrapar, que crasheaba toda la petición de carga y dejaba
// la fila en la BD atascada en estado PROCESANDO para siempre.
test('parsearCsv nunca lanza: una línea de comentario no rompe el archivo', () => {
  const csv = [
    '# This sample CSV file is provided by Sample-Files.com.',
    'ID,Name,Age,Country,Email',
    '1,John Doe,29,USA,john@example.com',
  ].join('\n')
  const filas = parsearCsv(Buffer.from(csv, 'utf-8'))
  assert.equal(filas.length, 1)
  assert.equal(filas[0].valido, false) // no sigue la plantilla de ContaAssist, pero no lanza
  assert.ok(filas[0].errores.length > 0)
})

test('parsearCsv nunca lanza: incluso contenido totalmente irrecuperable', () => {
  const filas = parsearCsv(Buffer.from('"campo sin cerrar\ny más basura', 'utf-8'))
  assert.equal(Array.isArray(filas), true)
  assert.equal(filas[0].valido, false)
})

// Fase 14: cac:InvoiceLine — el detalle es opcional para el resto del
// sistema, así que el XML sigue siendo válido con o sin líneas.
const XML_CON_LINEAS = XML_FACTURA_DEMO.replace(
  '</Invoice>',
  `<cac:InvoiceLine>
    <cbc:ID>1</cbc:ID>
    <cbc:InvoicedQuantity unitCode="KGM">10</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount>50000</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Description>Lomo de cerdo</cbc:Description>
      <cac:SellersItemIdentification><cbc:ID>PROD-001</cbc:ID></cac:SellersItemIdentification>
    </cac:Item>
    <cac:Price><cbc:PriceAmount>5000</cbc:PriceAmount></cac:Price>
  </cac:InvoiceLine>
  <cac:InvoiceLine>
    <cbc:ID>2</cbc:ID>
    <cbc:InvoicedQuantity>1</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount>50000</cbc:LineExtensionAmount>
    <cac:Item><cbc:Description>Costilla de cerdo</cbc:Description></cac:Item>
    <cac:Price><cbc:PriceAmount>50000</cbc:PriceAmount></cac:Price>
  </cac:InvoiceLine>
</Invoice>`,
)

test('parsearXmlFactura extrae las líneas (cac:InvoiceLine) cuando el XML las trae', () => {
  const resultado = parsearXmlFactura(Buffer.from(XML_CON_LINEAS, 'utf-8'))
  assert.equal(resultado.valido, true)
  assert.equal(resultado.lineas.length, 2)
  assert.equal(resultado.lineas[0].descripcion, 'Lomo de cerdo')
  assert.equal(resultado.lineas[0].codigoProducto, 'PROD-001')
  assert.equal(resultado.lineas[0].unidadMedida, 'KGM')
  assert.equal(resultado.lineas[0].cantidad, 10)
  assert.equal(resultado.lineas[0].valorUnitario, 5000)
  assert.equal(resultado.lineas[1].codigoProducto, null)
})

test('parsearXmlFactura devuelve lineas: [] cuando el XML no trae InvoiceLine', () => {
  const resultado = parsearXmlFactura(Buffer.from(XML_FACTURA_DEMO, 'utf-8'))
  assert.deepEqual(resultado.lineas, [])
})
