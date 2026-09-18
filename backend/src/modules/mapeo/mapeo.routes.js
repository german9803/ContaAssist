import { Router } from 'express'
import { requireAuth, requireEmpresa, requireRol } from '../../authentication/auth.middleware.js'
import {
  getMapeoCuentas,
  postMapeoCuenta,
  getMapeoFormasPago,
  postMapeoFormaPago,
  getMapeoTerceros,
  postMapeoTercero,
} from './mapeo.controller.js'

export const mapeoRouter = Router()

mapeoRouter.use(requireAuth, requireEmpresa)

const PUEDE_EDITAR = requireRol('ADMINISTRADOR', 'AUXILIAR_CONTABLE', 'CONTADOR')

mapeoRouter.get('/cuentas', getMapeoCuentas)
mapeoRouter.post('/cuentas', PUEDE_EDITAR, postMapeoCuenta)
mapeoRouter.get('/terceros', getMapeoTerceros)
mapeoRouter.post('/terceros', PUEDE_EDITAR, postMapeoTercero)
mapeoRouter.get('/formas-pago', getMapeoFormasPago)
mapeoRouter.post('/formas-pago', PUEDE_EDITAR, postMapeoFormaPago)
