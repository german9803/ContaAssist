import { Router } from 'express'
import multer from 'multer'
import { requireAuth, requireEmpresa, requireRol } from '../../authentication/auth.middleware.js'
import {
  getCuentas,
  postCuenta,
  postExtracto,
  getExtractos,
  getExtracto,
  postConciliar,
  postDesconciliar,
} from './bancos.controller.js'

const MAX_ARCHIVO_MB = Number(process.env.CARGA_MAX_ARCHIVO_MB || 20)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_ARCHIVO_MB * 1024 * 1024 } })

export const bancosRouter = Router()

bancosRouter.use(requireAuth, requireEmpresa)

const PUEDE_EDITAR = requireRol('ADMINISTRADOR', 'AUXILIAR_CONTABLE', 'CONTADOR')
// Conciliar vincula pagos ya registrados con líneas de extracto — mismo
// corte de roles que registrar/anular pagos (dinero real).
const PUEDE_CONCILIAR = requireRol('ADMINISTRADOR', 'CONTADOR')

bancosRouter.get('/cuentas', getCuentas)
bancosRouter.post('/cuentas', PUEDE_EDITAR, postCuenta)
bancosRouter.post('/cuentas/:id/extractos', PUEDE_EDITAR, upload.single('archivo'), postExtracto)
bancosRouter.get('/cuentas/:id/extractos', getExtractos)
bancosRouter.get('/extractos/:extractoId', getExtracto)
bancosRouter.post('/extractos/lineas/:lineaId/conciliar', PUEDE_CONCILIAR, postConciliar)
bancosRouter.post('/extractos/lineas/:lineaId/desconciliar', PUEDE_CONCILIAR, postDesconciliar)

// eslint-disable-next-line no-unused-vars
bancosRouter.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    return res.status(400).json({ error: `Error al subir el archivo: ${error.message}` })
  }
  next(error)
})
