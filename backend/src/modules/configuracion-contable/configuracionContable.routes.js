import { Router } from 'express'
import { requireAuth, requireEmpresa, requireRol } from '../../authentication/auth.middleware.js'
import {
  getCuentasContables,
  postCuentaContable,
  getCentrosCosto,
  postCentroCosto,
  getFormasPago,
  postFormaPago,
  getSistemasDestino,
} from './configuracionContable.controller.js'

export const configuracionContableRouter = Router()

configuracionContableRouter.use(requireAuth, requireEmpresa)

const PUEDE_EDITAR = requireRol('ADMINISTRADOR', 'AUXILIAR_CONTABLE', 'CONTADOR')

configuracionContableRouter.get('/cuentas-contables', getCuentasContables)
configuracionContableRouter.post('/cuentas-contables', PUEDE_EDITAR, postCuentaContable)
configuracionContableRouter.get('/centros-costo', getCentrosCosto)
configuracionContableRouter.post('/centros-costo', PUEDE_EDITAR, postCentroCosto)
configuracionContableRouter.get('/formas-pago', getFormasPago)
configuracionContableRouter.post('/formas-pago', PUEDE_EDITAR, postFormaPago)
configuracionContableRouter.get('/sistemas-destino', getSistemasDestino)
