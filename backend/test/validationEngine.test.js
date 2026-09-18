import { test } from 'node:test'
import assert from 'node:assert/strict'
import { calcularDigitoVerificacionNit, nitTieneFormatoValido } from '../src/validation-engine/nit.js'
import campoObligatorio from '../src/validation-engine/reglas/campoObligatorio.js'
import fechaValida from '../src/validation-engine/reglas/fechaValida.js'
import totalCuadrado from '../src/validation-engine/reglas/totalCuadrado.js'
import terceroIdentificado from '../src/validation-engine/reglas/terceroIdentificado.js'
import nitValido from '../src/validation-engine/reglas/nitValido.js'
import impuestoConsistente from '../src/validation-engine/reglas/impuestoConsistente.js'
import cuentaAsignada from '../src/validation-engine/reglas/cuentaAsignada.js'
import centroCostoRequerido from '../src/validation-engine/reglas/centroCostoRequerido.js'
import formaPagoFaltante from '../src/validation-engine/reglas/formaPagoFaltante.js'

test('calcularDigitoVerificacionNit reproduce el DV real de un NIT conocido (Bancolombia 890903938-8)', () => {
  assert.equal(calcularDigitoVerificacionNit('890903938'), 8)
})

test('nitTieneFormatoValido rechaza texto no numérico', () => {
  assert.equal(nitTieneFormatoValido('900ABC123'), false)
  assert.equal(nitTieneFormatoValido('900123456'), true)
})

test('campoObligatorio falla cuando falta el total', () => {
  const documento = { numeroDocumento: '1', fechaEmision: new Date(), terceroId: 'x', total: null }
  const r = campoObligatorio.evaluar(documento)
  assert.equal(r.resultado, 'FALLA')
  assert.match(r.mensaje, /total/)
})

test('campoObligatorio pasa cuando todo está presente', () => {
  const documento = { numeroDocumento: '1', fechaEmision: new Date(), terceroId: 'x', total: 100 }
  assert.equal(campoObligatorio.evaluar(documento).resultado, 'OK')
})

test('fechaValida rechaza una fecha futura', () => {
  const futura = new Date()
  futura.setDate(futura.getDate() + 5)
  const r = fechaValida.evaluar({ fechaEmision: futura })
  assert.equal(r.resultado, 'FALLA')
})

test('fechaValida acepta hoy y fechas pasadas', () => {
  assert.equal(fechaValida.evaluar({ fechaEmision: new Date() }).resultado, 'OK')
})

test('totalCuadrado detecta un total que no cuadra', () => {
  const r = totalCuadrado.evaluar({ subtotal: 100000, totalImpuestos: 19000, totalRetenciones: null, total: 999999 })
  assert.equal(r.resultado, 'FALLA')
})

test('totalCuadrado acepta subtotal + impuestos - retenciones == total', () => {
  const r = totalCuadrado.evaluar({ subtotal: 100000, totalImpuestos: 19000, totalRetenciones: 0, total: 119000 })
  assert.equal(r.resultado, 'OK')
})

test('terceroIdentificado falla sin terceroId', () => {
  assert.equal(terceroIdentificado.evaluar({ terceroId: null }).resultado, 'FALLA')
})

test('nitValido solo aplica a terceros con tipo NIT', () => {
  assert.equal(nitValido.aplicaA({ tercero: { tipoIdentificacion: 'CC' } }), false)
  assert.equal(nitValido.aplicaA({ tercero: { tipoIdentificacion: 'NIT' } }), true)
})

test('nitValido falla con un dígito de verificación incorrecto', () => {
  const r = nitValido.evaluar({ tercero: { identificacion: '890903938', dv: '9' } })
  assert.equal(r.resultado, 'FALLA')
})

test('nitValido pasa con el dígito de verificación correcto', () => {
  const r = nitValido.evaluar({ tercero: { identificacion: '890903938', dv: '8' } })
  assert.equal(r.resultado, 'OK')
})

test('nitValido pasa por formato cuando no hay dv registrado', () => {
  const r = nitValido.evaluar({ tercero: { identificacion: '900123456', dv: null } })
  assert.equal(r.resultado, 'OK')
})

test('impuestoConsistente detecta que el detalle no suma el total declarado', () => {
  const r = impuestoConsistente.evaluar({ totalImpuestos: 19000, impuestos: [{ valor: 5000 }] })
  assert.equal(r.resultado, 'FALLA')
})

test('impuestoConsistente pasa cuando el detalle sí suma el total', () => {
  const r = impuestoConsistente.evaluar({ totalImpuestos: 19000, impuestos: [{ valor: 15000 }, { valor: 4000 }] })
  assert.equal(r.resultado, 'OK')
})

test('cuentaAsignada es advertencia, no bloqueante, y falla sin cuentaContableId', () => {
  assert.equal(cuentaAsignada.severidad, 'ADVERTENCIA')
  assert.equal(cuentaAsignada.evaluar({ cuentaContableId: null }).resultado, 'FALLA')
  assert.equal(cuentaAsignada.evaluar({ cuentaContableId: 'x' }).resultado, 'OK')
})

test('centroCostoRequerido es advertencia (no hay config por empresa aún) y falla sin centroCostoId', () => {
  assert.equal(centroCostoRequerido.severidad, 'ADVERTENCIA')
  assert.equal(centroCostoRequerido.evaluar({ centroCostoId: null }).resultado, 'FALLA')
  assert.equal(centroCostoRequerido.evaluar({ centroCostoId: 'x' }).resultado, 'OK')
})

test('formaPagoFaltante es advertencia y falla sin formaPagoId', () => {
  assert.equal(formaPagoFaltante.severidad, 'ADVERTENCIA')
  assert.equal(formaPagoFaltante.evaluar({ formaPagoId: null }).resultado, 'FALLA')
  assert.equal(formaPagoFaltante.evaluar({ formaPagoId: 'x' }).resultado, 'OK')
})
