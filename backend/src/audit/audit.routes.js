import { Router } from 'express'
import { requireAuth, requireEmpresa, requireRol } from '../authentication/auth.middleware.js'
import { getAuditoria } from './audit.controller.js'

export const auditoriaRouter = Router()

auditoriaRouter.use(requireAuth, requireEmpresa)
auditoriaRouter.get('/', requireRol('ADMINISTRADOR'), getAuditoria)
