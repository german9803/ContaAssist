import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ADAPTADORES, obtenerAdaptador } from '../src/transformation-engine/registry.js'
import { clasificarPorPrerequisitos } from '../src/transformation-engine/engine.js'

test('obtenerAdaptador devuelve null si el sistema destino no tiene adaptador registrado', () => {
  assert.equal(obtenerAdaptador('EXCEL'), null)
})

test('obtenerAdaptador devuelve el adaptador registrado por su código', () => {
  const fake = { codigo: 'PRUEBA', versionFormato: '1', validarPrerequisitos: () => [], transformar: () => [] }
  ADAPTADORES.push(fake)
  try {
    assert.equal(obtenerAdaptador('PRUEBA'), fake)
  } finally {
    ADAPTADORES.splice(ADAPTADORES.indexOf(fake), 1)
  }
})

test('clasificarPorPrerequisitos deja todo listo cuando no hay errores', () => {
  const documentos = [{ id: 'a' }, { id: 'b' }]
  const { listos, pendientes } = clasificarPorPrerequisitos(documentos, [])
  assert.deepEqual(listos, ['a', 'b'])
  assert.deepEqual(pendientes, [])
})

test('clasificarPorPrerequisitos separa los documentos con error y los agrupa por documento', () => {
  const documentos = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
  const errores = [
    { documentoId: 'b', mensaje: 'tercero sin mapear' },
    { documentoId: 'b', mensaje: 'cuenta sin mapear' },
  ]
  const { listos, pendientes } = clasificarPorPrerequisitos(documentos, errores)
  assert.deepEqual(listos, ['a', 'c'])
  assert.deepEqual(pendientes, [{ documentoId: 'b', errores: ['tercero sin mapear', 'cuenta sin mapear'] }])
})
