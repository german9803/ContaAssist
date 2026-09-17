import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validarArchivo } from '../src/modules/cargas/cargas.validacionArchivo.js'

const PDF_MINIMO = Buffer.from('%PDF-1.4\n%âãÏÓ\n1 0 obj\n<< >>\nendobj\ntrailer\n<<>>\n')
const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
)

test('acepta un PDF real con extensión .pdf', async () => {
  const resultado = await validarArchivo(PDF_MINIMO, 'factura.pdf', 'PDF')
  assert.equal(resultado.valido, true)
  assert.equal(resultado.extension, 'pdf')
})

test('rechaza un PNG renombrado como .pdf (contenido no coincide)', async () => {
  const resultado = await validarArchivo(PNG_1PX, 'factura.pdf', 'PDF')
  assert.equal(resultado.valido, false)
  assert.match(resultado.motivo, /no coincide/)
})

test('rechaza extensión que no corresponde al tipoOrigen declarado', async () => {
  const resultado = await validarArchivo(PDF_MINIMO, 'factura.txt', 'PDF')
  assert.equal(resultado.valido, false)
  assert.match(resultado.motivo, /extensión/)
})

test('acepta un XML bien formado', async () => {
  const xml = Buffer.from('<?xml version="1.0"?>\n<Factura><Numero>1</Numero></Factura>')
  const resultado = await validarArchivo(xml, 'factura.xml', 'XML')
  assert.equal(resultado.valido, true)
})

test('rechaza contenido binario disfrazado de XML', async () => {
  const resultado = await validarArchivo(PNG_1PX, 'factura.xml', 'XML')
  assert.equal(resultado.valido, false)
})

test('acepta un CSV de texto plano', async () => {
  const csv = Buffer.from('numero,fecha,total\n1,2026-09-01,100000\n')
  const resultado = await validarArchivo(csv, 'movimientos.csv', 'CSV')
  assert.equal(resultado.valido, true)
})

test('rechaza contenido binario disfrazado de CSV', async () => {
  const resultado = await validarArchivo(PNG_1PX, 'movimientos.csv', 'CSV')
  assert.equal(resultado.valido, false)
})

test('acepta un PNG real', async () => {
  const resultado = await validarArchivo(PNG_1PX, 'recibo.png', 'PNG')
  assert.equal(resultado.valido, true)
})
