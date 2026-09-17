import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { postRegistro, postLogin, postRefresh, postLogout, getMe } from './auth.controller.js'
import { requireAuth } from './auth.middleware.js'

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos de inicio de sesión, intenta más tarde' },
})

const registroLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados registros desde este origen, intenta más tarde' },
})

export const authRouter = Router()

authRouter.post('/registro', registroLimiter, postRegistro)
authRouter.post('/login', loginLimiter, postLogin)
authRouter.post('/refresh', postRefresh)
authRouter.post('/logout', postLogout)
authRouter.get('/me', requireAuth, getMe)
