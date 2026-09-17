import { verifyAccessToken } from './jwt.js'

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const [scheme, token] = header.split(' ')

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Token de acceso requerido' })
  }

  try {
    const payload = verifyAccessToken(token)
    req.usuario = { id: payload.sub, email: payload.email, empresas: payload.empresas }
    next()
  } catch {
    return res.status(401).json({ error: 'Token de acceso inválido o expirado' })
  }
}

function resolverAcceso(req, res, empresaId) {
  const asignacion = req.usuario?.empresas?.find((e) => e.empresaId === empresaId)
  if (!asignacion) {
    res.status(403).json({ error: 'No tienes acceso a esta empresa' })
    return null
  }
  return asignacion
}

// Resuelve la empresa activa del request a partir del header X-Empresa-Id,
// verificando que el usuario autenticado realmente tenga acceso a esa empresa
// (nunca se confía en el empresaId que envía el cliente sin esta verificación).
// Usado por los módulos cuya URL no incluye la empresa (documentos, cargas, etc.).
export function requireEmpresa(req, res, next) {
  const empresaId = req.headers['x-empresa-id']
  if (!empresaId) {
    return res.status(400).json({ error: 'Header X-Empresa-Id requerido' })
  }

  const asignacion = resolverAcceso(req, res, empresaId)
  if (!asignacion) return

  req.empresaId = empresaId
  req.rolCodigo = asignacion.rolCodigo
  next()
}

// Igual que requireEmpresa pero toma el id de un parámetro de ruta
// (ej. /api/empresas/:id, /api/empresas/:id/usuarios).
export function requireEmpresaParam(paramName = 'id') {
  return (req, res, next) => {
    const empresaId = req.params[paramName]
    const asignacion = resolverAcceso(req, res, empresaId)
    if (!asignacion) return

    req.empresaId = empresaId
    req.rolCodigo = asignacion.rolCodigo
    next()
  }
}

// Requiere requireAuth + requireEmpresa previos en la cadena de middlewares.
export function requireRol(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.rolCodigo || !rolesPermitidos.includes(req.rolCodigo)) {
      return res.status(403).json({ error: 'No tienes el rol requerido para esta acción' })
    }
    next()
  }
}
