process.env.JWT_SECRET = 'test-access-secret'
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret'
process.env.JWT_EXPIRES_IN = '15m'
process.env.JWT_REFRESH_EXPIRES_IN = '7d'

import { test } from 'node:test'
import assert from 'node:assert/strict'
import jwt from 'jsonwebtoken'
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from '../src/authentication/jwt.js'

test('signAccessToken / verifyAccessToken viajan ida y vuelta con las empresas del usuario', () => {
  const empresas = [{ empresaId: 'emp-1', empresaNombre: 'Empresa Demo', rolCodigo: 'ADMINISTRADOR' }]
  const token = signAccessToken({ usuarioId: 'user-1', email: 'a@b.com', empresas })

  const payload = verifyAccessToken(token)
  assert.equal(payload.sub, 'user-1')
  assert.equal(payload.email, 'a@b.com')
  assert.deepEqual(payload.empresas, empresas)
})

test('un refresh token no puede usarse como access token', () => {
  const refreshToken = signRefreshToken({ usuarioId: 'user-1' })
  assert.throws(() => verifyAccessToken(refreshToken))
})

test('un access token no puede usarse como refresh token', () => {
  const accessToken = signAccessToken({ usuarioId: 'user-1', email: 'a@b.com', empresas: [] })
  assert.throws(() => verifyRefreshToken(accessToken))
})

test('verifyAccessToken rechaza un token firmado con otro secreto', () => {
  const tokenForjado = jwt.sign({ email: 'a@b.com', empresas: [], type: 'access' }, 'secreto-incorrecto', {
    subject: 'user-1',
    expiresIn: '15m',
  })
  assert.throws(() => verifyAccessToken(tokenForjado))
})
