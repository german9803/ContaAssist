import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sumarMovimientosPorCuenta } from '../src/modules/bancos/bancos.service.js'

test('sumarMovimientosPorCuenta: un RECAUDO suma al saldo', () => {
  const mapa = sumarMovimientosPorCuenta([{ cuentaBancariaId: 'c1', tipo: 'RECAUDO', valor: 100000 }])
  assert.equal(mapa.get('c1'), 100000)
})

test('sumarMovimientosPorCuenta: un PAGO resta del saldo', () => {
  const mapa = sumarMovimientosPorCuenta([{ cuentaBancariaId: 'c1', tipo: 'PAGO', valor: 40000 }])
  assert.equal(mapa.get('c1'), -40000)
})

test('sumarMovimientosPorCuenta: acumula varios movimientos de la misma cuenta', () => {
  const mapa = sumarMovimientosPorCuenta([
    { cuentaBancariaId: 'c1', tipo: 'RECAUDO', valor: 100000 },
    { cuentaBancariaId: 'c1', tipo: 'PAGO', valor: 30000 },
    { cuentaBancariaId: 'c1', tipo: 'RECAUDO', valor: 20000 },
  ])
  assert.equal(mapa.get('c1'), 90000)
})

test('sumarMovimientosPorCuenta: separa cuentas distintas', () => {
  const mapa = sumarMovimientosPorCuenta([
    { cuentaBancariaId: 'c1', tipo: 'RECAUDO', valor: 100000 },
    { cuentaBancariaId: 'c2', tipo: 'PAGO', valor: 50000 },
  ])
  assert.equal(mapa.get('c1'), 100000)
  assert.equal(mapa.get('c2'), -50000)
})

test('sumarMovimientosPorCuenta: sin movimientos devuelve un mapa vacío', () => {
  const mapa = sumarMovimientosPorCuenta([])
  assert.equal(mapa.size, 0)
})
