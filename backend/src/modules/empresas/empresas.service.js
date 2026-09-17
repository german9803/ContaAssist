import { prisma } from '../../shared/prisma.js'
import { buscarPorEmail, crearUsuario, generarPasswordTemporal } from '../usuarios/usuarios.service.js'

class EmpresaError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.status = status
  }
}

function serializarEmpresa(empresa) {
  return {
    id: empresa.id,
    nit: empresa.nit,
    razonSocial: empresa.razonSocial,
    nombreComercial: empresa.nombreComercial,
    activa: empresa.activa,
    creadoEn: empresa.creadoEn,
  }
}

function serializarMembresia(membresia) {
  return {
    usuarioId: membresia.usuarioId,
    email: membresia.usuario.email,
    nombreCompleto: membresia.usuario.nombreCompleto,
    rolCodigo: membresia.rol.codigo,
    activo: membresia.activo,
  }
}

// Un usuario ya autenticado puede dar de alta una empresa adicional (ej. un
// contador que atiende varios clientes); queda como ADMINISTRADOR de esa empresa.
export async function crearEmpresa({ nit, razonSocial, nombreComercial, usuarioCreadorId }) {
  const nitEnUso = await prisma.empresa.findUnique({ where: { nit } })
  if (nitEnUso) {
    throw new EmpresaError('Ya existe una empresa con ese NIT', 409)
  }

  const rolAdmin = await prisma.rol.findUnique({ where: { codigo: 'ADMINISTRADOR' } })
  if (!rolAdmin) {
    throw new EmpresaError('Catálogo de roles no inicializado (falta correr el seed)', 500)
  }

  const empresa = await prisma.$transaction(async (tx) => {
    const empresa = await tx.empresa.create({
      data: { nit, razonSocial, nombreComercial: nombreComercial || null },
    })
    await tx.usuarioEmpresaRol.create({
      data: { usuarioId: usuarioCreadorId, empresaId: empresa.id, rolId: rolAdmin.id },
    })
    return empresa
  })

  return serializarEmpresa(empresa)
}

export async function listarEmpresasDeUsuario(usuarioId) {
  const membresias = await prisma.usuarioEmpresaRol.findMany({
    where: { usuarioId, activo: true },
    include: { empresa: true, rol: true },
  })

  return membresias.map((m) => ({ ...serializarEmpresa(m.empresa), rolCodigo: m.rol.codigo }))
}

export async function obtenerEmpresa(empresaId) {
  const empresa = await prisma.empresa.findUnique({ where: { id: empresaId } })
  if (!empresa) {
    throw new EmpresaError('Empresa no encontrada', 404)
  }
  return serializarEmpresa(empresa)
}

export async function actualizarEmpresa(empresaId, { razonSocial, nombreComercial }) {
  const data = {}
  if (razonSocial !== undefined) data.razonSocial = razonSocial
  if (nombreComercial !== undefined) data.nombreComercial = nombreComercial

  const empresa = await prisma.empresa.update({ where: { id: empresaId }, data })
  return serializarEmpresa(empresa)
}

export async function listarUsuariosDeEmpresa(empresaId) {
  const membresias = await prisma.usuarioEmpresaRol.findMany({
    where: { empresaId },
    include: { usuario: true, rol: true },
    orderBy: { usuario: { nombreCompleto: 'asc' } },
  })
  return membresias.map(serializarMembresia)
}

async function validarRol(rolCodigo) {
  const rol = await prisma.rol.findUnique({ where: { codigo: rolCodigo } })
  if (!rol) {
    throw new EmpresaError(`Rol "${rolCodigo}" no existe`, 400)
  }
  return rol
}

// Invita (o reactiva) a un usuario dentro de la empresa. Si el email no
// existe todavía como usuario, se crea con una contraseña temporal que se
// devuelve una sola vez en la respuesta (no hay envío de correo en esta fase;
// el ADMINISTRADOR debe compartirla manualmente).
export async function invitarUsuario({ empresaId, email, nombreCompleto, rolCodigo }) {
  const rol = await validarRol(rolCodigo)

  let usuario = await buscarPorEmail(email)
  let passwordTemporal

  if (!usuario) {
    if (!nombreCompleto) {
      throw new EmpresaError('nombreCompleto es requerido para crear un usuario nuevo', 400)
    }
    passwordTemporal = generarPasswordTemporal()
    usuario = await crearUsuario({ email, nombreCompleto, passwordPlano: passwordTemporal })
  }

  const membresiaExistente = await prisma.usuarioEmpresaRol.findUnique({
    where: { usuarioId_empresaId: { usuarioId: usuario.id, empresaId } },
  })
  if (membresiaExistente) {
    throw new EmpresaError('Este usuario ya pertenece a la empresa', 409)
  }

  await prisma.usuarioEmpresaRol.create({
    data: { usuarioId: usuario.id, empresaId, rolId: rol.id },
  })

  return {
    usuarioId: usuario.id,
    email: usuario.email,
    nombreCompleto: usuario.nombreCompleto,
    rolCodigo: rol.codigo,
    passwordTemporal, // undefined si el usuario ya existía
  }
}

async function contarAdministradoresActivos(empresaId, excluirUsuarioId) {
  return prisma.usuarioEmpresaRol.count({
    where: {
      empresaId,
      activo: true,
      rol: { codigo: 'ADMINISTRADOR' },
      usuarioId: { not: excluirUsuarioId },
    },
  })
}

export async function actualizarMembresia({ empresaId, usuarioId, rolCodigo, activo }) {
  const membresia = await prisma.usuarioEmpresaRol.findUnique({
    where: { usuarioId_empresaId: { usuarioId, empresaId } },
    include: { rol: true },
  })
  if (!membresia) {
    throw new EmpresaError('El usuario no pertenece a esta empresa', 404)
  }

  const dejaDeSerAdminActivo =
    membresia.rol.codigo === 'ADMINISTRADOR' &&
    membresia.activo &&
    ((rolCodigo && rolCodigo !== 'ADMINISTRADOR') || activo === false)

  if (dejaDeSerAdminActivo) {
    const otrosAdmins = await contarAdministradoresActivos(empresaId, usuarioId)
    if (otrosAdmins === 0) {
      throw new EmpresaError('La empresa debe conservar al menos un administrador activo', 409)
    }
  }

  const data = {}
  if (activo !== undefined) data.activo = activo
  if (rolCodigo !== undefined) {
    const rol = await validarRol(rolCodigo)
    data.rolId = rol.id
  }

  const actualizada = await prisma.usuarioEmpresaRol.update({
    where: { usuarioId_empresaId: { usuarioId, empresaId } },
    data,
    include: { usuario: true, rol: true },
  })

  return serializarMembresia(actualizada)
}

export { EmpresaError }
