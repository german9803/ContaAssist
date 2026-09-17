import { prisma } from '../shared/prisma.js'
import { hashPassword, verifyPassword } from './password.js'
import { signAccessToken, signRefreshToken, verifyRefreshToken } from './jwt.js'

class AuthError extends Error {
  constructor(message, status = 401) {
    super(message)
    this.status = status
  }
}

async function cargarEmpresasActivas(usuarioId) {
  const asignaciones = await prisma.usuarioEmpresaRol.findMany({
    where: { usuarioId, activo: true, empresa: { activa: true } },
    include: { empresa: true, rol: true },
  })

  return asignaciones.map((a) => ({
    empresaId: a.empresaId,
    empresaNombre: a.empresa.razonSocial,
    rolCodigo: a.rol.codigo,
  }))
}

export async function login(email, plainPassword) {
  const usuario = await prisma.usuario.findUnique({ where: { email } })
  if (!usuario || !usuario.activo) {
    throw new AuthError('Credenciales inválidas')
  }

  const passwordValida = await verifyPassword(plainPassword, usuario.passwordHash)
  if (!passwordValida) {
    throw new AuthError('Credenciales inválidas')
  }

  const empresas = await cargarEmpresasActivas(usuario.id)

  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { ultimoLogin: new Date() },
  })

  const accessToken = signAccessToken({ usuarioId: usuario.id, email: usuario.email, empresas })
  const refreshToken = signRefreshToken({ usuarioId: usuario.id })

  return {
    accessToken,
    refreshToken,
    usuario: {
      id: usuario.id,
      email: usuario.email,
      nombreCompleto: usuario.nombreCompleto,
      empresas,
    },
  }
}

export async function refrescarSesion(refreshToken) {
  let payload
  try {
    payload = verifyRefreshToken(refreshToken)
  } catch {
    throw new AuthError('Refresh token inválido o expirado')
  }

  const usuario = await prisma.usuario.findUnique({ where: { id: payload.sub } })
  if (!usuario || !usuario.activo) {
    throw new AuthError('Usuario no válido')
  }

  const empresas = await cargarEmpresasActivas(usuario.id)
  const accessToken = signAccessToken({ usuarioId: usuario.id, email: usuario.email, empresas })

  return { accessToken }
}

export async function obtenerPerfil(usuarioId) {
  const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } })
  if (!usuario || !usuario.activo) {
    throw new AuthError('Usuario no válido', 404)
  }

  const empresas = await cargarEmpresasActivas(usuario.id)

  return {
    id: usuario.id,
    email: usuario.email,
    nombreCompleto: usuario.nombreCompleto,
    empresas,
  }
}

// Registro de autoservicio: crea el usuario, su primera empresa y lo deja como
// ADMINISTRADOR de esa empresa, todo en una sola transacción (sección 8/10).
export async function registrar({
  email,
  password,
  nombreCompleto,
  empresaNit,
  empresaRazonSocial,
  empresaNombreComercial,
}) {
  const yaExiste = await prisma.usuario.findUnique({ where: { email } })
  if (yaExiste) {
    throw new AuthError('Ya existe un usuario con ese email', 409)
  }

  const nitEnUso = await prisma.empresa.findUnique({ where: { nit: empresaNit } })
  if (nitEnUso) {
    throw new AuthError('Ya existe una empresa con ese NIT', 409)
  }

  const rolAdmin = await prisma.rol.findUnique({ where: { codigo: 'ADMINISTRADOR' } })
  if (!rolAdmin) {
    throw new AuthError('Catálogo de roles no inicializado (falta correr el seed)', 500)
  }

  const passwordHash = await hashPassword(password)

  const { usuario, empresa } = await prisma.$transaction(async (tx) => {
    const usuario = await tx.usuario.create({
      data: { email, passwordHash, nombreCompleto },
    })
    const empresa = await tx.empresa.create({
      data: {
        nit: empresaNit,
        razonSocial: empresaRazonSocial,
        nombreComercial: empresaNombreComercial || null,
      },
    })
    await tx.usuarioEmpresaRol.create({
      data: { usuarioId: usuario.id, empresaId: empresa.id, rolId: rolAdmin.id },
    })
    return { usuario, empresa }
  })

  const empresas = [{ empresaId: empresa.id, empresaNombre: empresa.razonSocial, rolCodigo: 'ADMINISTRADOR' }]
  const accessToken = signAccessToken({ usuarioId: usuario.id, email: usuario.email, empresas })
  const refreshToken = signRefreshToken({ usuarioId: usuario.id })

  return {
    accessToken,
    refreshToken,
    usuario: { id: usuario.id, email: usuario.email, nombreCompleto: usuario.nombreCompleto, empresas },
  }
}

export { AuthError }
