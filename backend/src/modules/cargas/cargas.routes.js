import { Router } from 'express'
import multer from 'multer'
import { requireAuth, requireEmpresa, requireRol } from '../../authentication/auth.middleware.js'
import { postCarga, getCargas, getCarga, getArchivosDeCarga, getDescargaArchivo } from './cargas.controller.js'

const MAX_ARCHIVO_MB = Number(process.env.CARGA_MAX_ARCHIVO_MB || 20)
const MAX_ARCHIVOS = Number(process.env.CARGA_MAX_ARCHIVOS || 200)

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_ARCHIVO_MB * 1024 * 1024, files: MAX_ARCHIVOS },
})

export const cargasRouter = Router()

cargasRouter.use(requireAuth, requireEmpresa)

cargasRouter.post(
  '/',
  requireRol('ADMINISTRADOR', 'AUXILIAR_CONTABLE', 'CONTADOR'),
  upload.array('archivos', MAX_ARCHIVOS),
  postCarga,
)
cargasRouter.get('/', getCargas)
cargasRouter.get('/:id', getCarga)
cargasRouter.get('/:id/archivos', getArchivosDeCarga)
cargasRouter.get('/:id/archivos/:archivoId/descarga', getDescargaArchivo)

// eslint-disable-next-line no-unused-vars
cargasRouter.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    return res.status(400).json({ error: `Error al subir archivos: ${error.message}` })
  }
  next(error)
})
