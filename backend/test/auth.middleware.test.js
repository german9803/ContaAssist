process.env.JWT_SECRET = 'test-access-secret'
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret'

import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  requireAuth,
  requireEmpresa,
  requireEmpresaParam,
  requireRol,
} from '../src/authentication/auth.middleware.js'
import { signAccessToken } from '../src/authentication/jwt.js'

function mockRes() {
  const res = {}
  res.statusCode = 200
  res.body = undefined
  res.status = (code) => {
    res.statusCode = code
    return res
  }
  res.json = (body) => {
    res.body = body
    return res
  }
  return res
}

test('requireAuth rechaza sin header Authorization', () => {
  const req = { headers: {} }
  const res = mockRes()
  requireAuth(req, res, () => assert.fail('no debería llamar next()'))
  assert.equal(res.statusCode, 401)
})

test('requireAuth acepta un token válido y adjunta req.usuario', () => {
  const empresas = [{ empresaId: 'emp-1', empresaNombre: 'Demo', rolCodigo: 'AUXILIAR_CONTABLE' }]
  const token = signAccessToken({ usuarioId: 'user-1', email: 'a@b.com', empresas })
  const req = { headers: { authorization: `Bearer ${token}` } }
  const res = mockRes()

  let nextLlamado = false
  requireAuth(req, res, () => {
    nextLlamado = true
  })

  assert.equal(nextLlamado, true)
  assert.equal(req.usuario.id, 'user-1')
  assert.deepEqual(req.usuario.empresas, empresas)
})

test('requireEmpresa rechaza si el usuario no pertenece a la empresa solicitada', () => {
  const req = {
    headers: { 'x-empresa-id': 'emp-ajena' },
    usuario: { empresas: [{ empresaId: 'emp-1', rolCodigo: 'CONTADOR' }] },
  }
  const res = mockRes()
  requireEmpresa(req, res, () => assert.fail('no debería llamar next()'))
  assert.equal(res.statusCode, 403)
})

test('requireEmpresa acepta y fija req.empresaId/req.rolCodigo cuando hay acceso', () => {
  const req = {
    headers: { 'x-empresa-id': 'emp-1' },
    usuario: { empresas: [{ empresaId: 'emp-1', rolCodigo: 'CONTADOR' }] },
  }
  const res = mockRes()
  requireEmpresa(req, res, () => {})
  assert.equal(req.empresaId, 'emp-1')
  assert.equal(req.rolCodigo, 'CONTADOR')
})

test('requireEmpresaParam lee el id de req.params y rechaza sin acceso', () => {
  const req = {
    params: { id: 'emp-ajena' },
    usuario: { empresas: [{ empresaId: 'emp-1', rolCodigo: 'ADMINISTRADOR' }] },
  }
  const res = mockRes()
  requireEmpresaParam('id')(req, res, () => assert.fail('no debería llamar next()'))
  assert.equal(res.statusCode, 403)
})

test('requireEmpresaParam acepta y fija req.empresaId/req.rolCodigo cuando hay acceso', () => {
  const req = {
    params: { id: 'emp-1' },
    usuario: { empresas: [{ empresaId: 'emp-1', rolCodigo: 'ADMINISTRADOR' }] },
  }
  const res = mockRes()
  requireEmpresaParam('id')(req, res, () => {})
  assert.equal(req.empresaId, 'emp-1')
  assert.equal(req.rolCodigo, 'ADMINISTRADOR')
})

test('requireRol bloquea roles no autorizados', () => {
  const req = { rolCodigo: 'CONSULTA' }
  const res = mockRes()
  requireRol('ADMINISTRADOR', 'CONTADOR')(req, res, () => assert.fail('no debería llamar next()'))
  assert.equal(res.statusCode, 403)
})

test('requireRol permite roles autorizados', () => {
  const req = { rolCodigo: 'ADMINISTRADOR' }
  const res = mockRes()
  let nextLlamado = false
  requireRol('ADMINISTRADOR', 'CONTADOR')(req, res, () => {
    nextLlamado = true
  })
  assert.equal(nextLlamado, true)
})
