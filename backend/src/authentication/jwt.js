import jwt from 'jsonwebtoken'

const ACCESS_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m'
const REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d'

function accessSecret() {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET no está configurado')
  return secret
}

function refreshSecret() {
  const secret = process.env.JWT_REFRESH_SECRET
  if (!secret) throw new Error('JWT_REFRESH_SECRET no está configurado')
  return secret
}

// empresas: [{ empresaId, rolCodigo }] — las empresas y el rol del usuario en cada una,
// para que el middleware de autorización no dependa de una consulta a BD en cada request.
export function signAccessToken({ usuarioId, email, empresas }) {
  return jwt.sign({ email, empresas, type: 'access' }, accessSecret(), {
    subject: usuarioId,
    expiresIn: ACCESS_EXPIRES_IN,
  })
}

export function signRefreshToken({ usuarioId }) {
  return jwt.sign({ type: 'refresh' }, refreshSecret(), {
    subject: usuarioId,
    expiresIn: REFRESH_EXPIRES_IN,
  })
}

export function verifyAccessToken(token) {
  const payload = jwt.verify(token, accessSecret())
  if (payload.type !== 'access') throw new Error('Token no es de tipo access')
  return payload
}

export function verifyRefreshToken(token) {
  const payload = jwt.verify(token, refreshSecret())
  if (payload.type !== 'refresh') throw new Error('Token no es de tipo refresh')
  return payload
}
