import { test } from 'node:test'
import assert from 'node:assert/strict'
import { calcularEstadoPago } from '../src/modules/pagos/pagos.service.js'

test('calcularEstadoPago: sin nada aplicado queda PENDIENTE', () => {
  const r = calcularEstadoPago({ total: 100000, aplicado: 0 })
  assert.equal(r.estadoCartera, 'PENDIENTE')
  assert.equal(r.saldoPendiente, 100000)
  assert.equal(r.vencido, false)
})

test('calcularEstadoPago: aplicado parcial queda PARCIAL con el saldo restante', () => {
  const r = calcularEstadoPago({ total: 100000, aplicado: 40000 })
  assert.equal(r.estadoCartera, 'PARCIAL')
  assert.equal(r.saldoPendiente, 60000)
})

test('calcularEstadoPago: aplicado completo queda PAGADO con saldo 0', () => {
  const r = calcularEstadoPago({ total: 100000, aplicado: 100000 })
  assert.equal(r.estadoCartera, 'PAGADO')
  assert.equal(r.saldoPendiente, 0)
})

test('calcularEstadoPago: tolera 1 peso de diferencia por redondeo como PAGADO', () => {
  const r = calcularEstadoPago({ total: 100000, aplicado: 99999.5 })
  assert.equal(r.estadoCartera, 'PAGADO')
})

test('calcularEstadoPago: un documento PAGADO nunca queda vencido aunque su fecha ya pasó', () => {
  const ayer = new Date(Date.now() - 86400000)
  const r = calcularEstadoPago({ total: 100000, aplicado: 100000, fechaVencimiento: ayer })
  assert.equal(r.vencido, false)
})

test('calcularEstadoPago: PENDIENTE con fecha de vencimiento pasada queda vencido', () => {
  const ayer = new Date(Date.now() - 86400000)
  const r = calcularEstadoPago({ total: 100000, aplicado: 0, fechaVencimiento: ayer })
  assert.equal(r.vencido, true)
})

test('calcularEstadoPago: PENDIENTE con fecha de vencimiento futura no está vencido', () => {
  const manana = new Date(Date.now() + 86400000)
  const r = calcularEstadoPago({ total: 100000, aplicado: 0, fechaVencimiento: manana })
  assert.equal(r.vencido, false)
})

test('calcularEstadoPago: sin fecha de vencimiento nunca queda vencido', () => {
  const r = calcularEstadoPago({ total: 100000, aplicado: 0, fechaVencimiento: null })
  assert.equal(r.vencido, false)
})

test('calcularEstadoPago: el saldo nunca es negativo aunque se aplique de más', () => {
  const r = calcularEstadoPago({ total: 100000, aplicado: 150000 })
  assert.equal(r.saldoPendiente, 0)
  assert.equal(r.estadoCartera, 'PAGADO')
})
