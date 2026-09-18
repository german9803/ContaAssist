import { Router } from 'express'
import { requireAuth, requireEmpresa, requireRol } from '../../authentication/auth.middleware.js'
import { getTerceros, getTercero, postTercero, patchTercero } from './terceros.controller.js'

export const tercerosRouter = Router()

tercerosRouter.use(requireAuth, requireEmpresa)

const PUEDE_EDITAR = requireRol('ADMINISTRADOR', 'AUXILIAR_CONTABLE', 'CONTADOR')

tercerosRouter.get('/', getTerceros)
tercerosRouter.get('/:id', getTercero)
tercerosRouter.post('/', PUEDE_EDITAR, postTercero)
tercerosRouter.patch('/:id', PUEDE_EDITAR, patchTercero)
