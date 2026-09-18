import { Router } from 'express'
import { requireAuth, requireEmpresa, requireRol } from '../../authentication/auth.middleware.js'
import {
  getDocumentos,
  getResumen,
  getDocumento,
  patchDocumento,
  postRevalidar,
  postAprobar,
  postRechazar,
  getArchivoOriginal,
} from './documentos.controller.js'

export const documentosRouter = Router()

documentosRouter.use(requireAuth, requireEmpresa)

// AUXILIAR_CONTABLE prepara y corrige; ADMINISTRADOR/CONTADOR aprueban o
// rechazan (sección 9: "el contador revisa, valida y aprueba información").
const PUEDE_EDITAR = requireRol('ADMINISTRADOR', 'AUXILIAR_CONTABLE', 'CONTADOR')
const PUEDE_APROBAR = requireRol('ADMINISTRADOR', 'CONTADOR')

documentosRouter.get('/', getDocumentos)
documentosRouter.get('/resumen', getResumen) // antes de /:id — si no, Express lo confundiría con un id
documentosRouter.get('/:id', getDocumento)
documentosRouter.get('/:id/archivo-original', getArchivoOriginal)
documentosRouter.patch('/:id', PUEDE_EDITAR, patchDocumento)
documentosRouter.post('/:id/revalidar', PUEDE_EDITAR, postRevalidar)
documentosRouter.post('/:id/aprobar', PUEDE_APROBAR, postAprobar)
documentosRouter.post('/:id/rechazar', PUEDE_APROBAR, postRechazar)
