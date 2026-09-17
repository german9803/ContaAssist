import { Router } from 'express'
import {
  postEmpresa,
  getEmpresas,
  getEmpresa,
  patchEmpresa,
  getUsuariosDeEmpresa,
  postUsuarioEnEmpresa,
  patchUsuarioEnEmpresa,
} from './empresas.controller.js'
import { requireAuth, requireEmpresaParam, requireRol } from '../../authentication/auth.middleware.js'

export const empresasRouter = Router()

empresasRouter.use(requireAuth)

empresasRouter.post('/', postEmpresa)
empresasRouter.get('/', getEmpresas)

empresasRouter.get('/:id', requireEmpresaParam('id'), getEmpresa)
empresasRouter.patch('/:id', requireEmpresaParam('id'), requireRol('ADMINISTRADOR'), patchEmpresa)

empresasRouter.get('/:id/usuarios', requireEmpresaParam('id'), getUsuariosDeEmpresa)
empresasRouter.post(
  '/:id/usuarios',
  requireEmpresaParam('id'),
  requireRol('ADMINISTRADOR'),
  postUsuarioEnEmpresa,
)
empresasRouter.patch(
  '/:id/usuarios/:usuarioId',
  requireEmpresaParam('id'),
  requireRol('ADMINISTRADOR'),
  patchUsuarioEnEmpresa,
)
