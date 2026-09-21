import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { extraerTextoImagen } from '../src/document-processing/ocrParser.js'

const FIXTURES_DIR = path.dirname(fileURLToPath(import.meta.url))

// factura-ocr.png es una imagen real (no un mock) con el texto "FACTURA No
// 12345" — reconocido con Tesseract real, sin stubs, igual que el resto de
// este proyecto prueba parsers contra archivos reales.
test('extraerTextoImagen reconoce texto real de una imagen (Tesseract, español)', async () => {
  const buffer = await readFile(path.join(FIXTURES_DIR, 'fixtures', 'factura-ocr.png'))
  const resultado = await extraerTextoImagen(buffer)
  assert.equal(resultado.error, null)
  assert.match(resultado.texto, /FACTURA/i)
  assert.match(resultado.texto, /12345/)
  assert.ok(resultado.confianza > 50, `confianza esperada >50, fue ${resultado.confianza}`)
})

test('extraerTextoImagen nunca lanza: contenido no-imagen devuelve error en vez de excepción', async () => {
  const resultado = await extraerTextoImagen(Buffer.from('esto no es una imagen'))
  assert.equal(resultado.texto, null)
  assert.ok(resultado.error)
})
