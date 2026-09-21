import { Router } from 'express'
import { requireAuth, requireEmpresa, requireRol } from '../../authentication/auth.middleware.js'
import { getDocumentosConSaldo, getResumen, postPago, getPagos, getPago, postAnular } from './pagos.controller.js'

export const pagosRouter = Router()

pagosRouter.use(requireAuth, requireEmpresa)

// Registrar/anular mueve dinero real — mismo corte de roles que aprobar
// documentos y generar exportaciones; AUXILIAR_CONTABLE no registra pagos sin
// supervisión.
const PUEDE_REGISTRAR = requireRol('ADMINISTRADOR', 'CONTADOR')

pagosRouter.get('/documentos', getDocumentosConSaldo) // antes de /:id — si no, Express lo confundiría con un id
pagosRouter.get('/resumen', getResumen)
pagosRouter.post('/', PUEDE_REGISTRAR, postPago)
pagosRouter.get('/', getPagos)
pagosRouter.get('/:id', getPago)
pagosRouter.post('/:id/anular', PUEDE_REGISTRAR, postAnular)
