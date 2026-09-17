import { test } from 'node:test'
import assert from 'node:assert/strict'
import { hashPassword, verifyPassword } from '../src/authentication/password.js'

test('hashPassword genera un hash distinto al texto plano', async () => {
  const hash = await hashPassword('MiPassword123!')
  assert.notEqual(hash, 'MiPassword123!')
  assert.ok(hash.startsWith('$2b$'))
})

test('verifyPassword acepta la contraseña correcta', async () => {
  const hash = await hashPassword('MiPassword123!')
  assert.equal(await verifyPassword('MiPassword123!', hash), true)
})

test('verifyPassword rechaza una contraseña incorrecta', async () => {
  const hash = await hashPassword('MiPassword123!')
  assert.equal(await verifyPassword('otra-clave', hash), false)
})
