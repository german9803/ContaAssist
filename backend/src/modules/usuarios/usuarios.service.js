import crypto from 'node:crypto'
import { prisma } from '../../shared/prisma.js'
import { hashPassword } from '../../authentication/password.js'

export function generarPasswordTemporal() {
  return crypto.randomBytes(9).toString('base64url') // 12 caracteres, suficiente para una contraseña temporal
}

export function buscarPorEmail(email) {
  return prisma.usuario.findUnique({ where: { email } })
}

export async function crearUsuario({ email, nombreCompleto, passwordPlano }) {
  const passwordHash = await hashPassword(passwordPlano)
  return prisma.usuario.create({
    data: { email, passwordHash, nombreCompleto },
  })
}
