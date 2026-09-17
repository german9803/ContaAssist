import express from 'express'
import cors from 'cors'

export function createApp() {
  const app = express()

  app.use(cors({ origin: process.env.CORS_ORIGIN }))
  app.use(express.json())

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'contaassist-backend' })
  })

  return app
}
