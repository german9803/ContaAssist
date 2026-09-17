import { Router } from 'express'
import { requireAuth, requireEmpresa, requireRol } from '../../authentication/auth.middleware.js'
import { getDocumentos, getDocumento, patchDocumento, getArchivoOriginal } from './documentos.controller.js'

export const documentosRouter = Router()

documentosRouter.use(requireAuth, requireEmpresa)

documentosRouter.get('/', getDocumentos)
documentosRouter.get('/:id', getDocumento)
documentosRouter.get('/:id/archivo-original', getArchivoOriginal)
documentosRouter.patch('/:id', requireRol('ADMINISTRADOR', 'AUXILIAR_CONTABLE', 'CONTADOR'), patchDocumento)
