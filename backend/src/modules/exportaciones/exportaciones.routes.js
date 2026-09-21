import { Router } from 'express'
import { requireAuth, requireEmpresa, requireRol } from '../../authentication/auth.middleware.js'
import { postPreview, postExportacion, getExportaciones, getExportacion, getDescarga } from './exportaciones.controller.js'

export const exportacionesRouter = Router()

exportacionesRouter.use(requireAuth, requireEmpresa)

// Generar el archivo es la culminación del ciclo aprobar → exportar (sección 9):
// mismos roles que pueden aprobar documentos; AUXILIAR_CONTABLE prepara pero no exporta.
const PUEDE_EXPORTAR = requireRol('ADMINISTRADOR', 'CONTADOR')

exportacionesRouter.post('/preview', PUEDE_EXPORTAR, postPreview)
exportacionesRouter.post('/', PUEDE_EXPORTAR, postExportacion)
exportacionesRouter.get('/', getExportaciones)
exportacionesRouter.get('/:id', getExportacion)
exportacionesRouter.get('/:id/descargar', getDescarga)
