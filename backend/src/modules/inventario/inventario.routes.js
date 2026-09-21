import { Router } from 'express'
import { requireAuth, requireEmpresa, requireRol } from '../../authentication/auth.middleware.js'
import { getProductos, postProducto, getBodegas, postBodega } from './inventario.controller.js'

export const inventarioRouter = Router()

inventarioRouter.use(requireAuth, requireEmpresa)

const PUEDE_EDITAR = requireRol('ADMINISTRADOR', 'AUXILIAR_CONTABLE', 'CONTADOR')

inventarioRouter.get('/productos', getProductos)
inventarioRouter.post('/productos', PUEDE_EDITAR, postProducto)
inventarioRouter.get('/bodegas', getBodegas)
inventarioRouter.post('/bodegas', PUEDE_EDITAR, postBodega)
