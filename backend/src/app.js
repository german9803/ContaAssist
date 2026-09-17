import express from 'express'
import cors from 'cors'
import { authRouter } from './authentication/auth.routes.js'
import { empresasRouter } from './modules/empresas/empresas.routes.js'
import { cargasRouter } from './modules/cargas/cargas.routes.js'
import { auditoriaRouter } from './audit/audit.routes.js'

export function createApp() {
  const app = express()

  app.use(cors({ origin: process.env.CORS_ORIGIN }))
  app.use(express.json())

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'contaassist-backend' })
  })

  app.use('/api/auth', authRouter)
  app.use('/api/empresas', empresasRouter)
  app.use('/api/cargas', cargasRouter)
  app.use('/api/auditoria', auditoriaRouter)

  app.use((req, res) => {
    res.status(404).json({ error: 'Recurso no encontrado' })
  })

  // Manejador de errores centralizado: nunca expone stack traces ni detalles
  // internos al cliente (sección 22/security.md — manejo seguro de errores).
  // eslint-disable-next-line no-unused-vars
  app.use((error, req, res, next) => {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  })

  return app
}
