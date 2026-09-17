import 'dotenv/config'
import { prisma } from '../src/shared/prisma.js'
import { hashPassword } from '../src/authentication/password.js'

const ROLES = [
  { codigo: 'ADMINISTRADOR', nombre: 'Administrador' },
  { codigo: 'AUXILIAR_CONTABLE', nombre: 'Auxiliar contable' },
  { codigo: 'CONTADOR', nombre: 'Contador' },
  { codigo: 'CONSULTA', nombre: 'Consulta' },
]

const IMPUESTOS = [
  { codigo: 'IVA_19', nombre: 'IVA 19%', porcentaje: 19 },
  { codigo: 'IVA_5', nombre: 'IVA 5%', porcentaje: 5 },
  { codigo: 'IVA_0', nombre: 'IVA 0%', porcentaje: 0 },
]

// Debe reflejar los códigos implementados en validation-engine/registry.js
const REGLAS_VALIDACION = [
  { codigo: 'CAMPO_OBLIGATORIO_FALTANTE', descripcion: 'Número, fecha, tercero o total ausentes', severidad: 'BLOQUEANTE' },
  { codigo: 'FECHA_INVALIDA', descripcion: 'Fecha de emisión en el futuro', severidad: 'BLOQUEANTE' },
  { codigo: 'TOTAL_DESCUADRADO', descripcion: 'subtotal + impuestos - retenciones no coincide con el total', severidad: 'BLOQUEANTE' },
  { codigo: 'TERCERO_NO_IDENTIFICADO', descripcion: 'No se identificó el tercero del documento', severidad: 'BLOQUEANTE' },
  { codigo: 'NIT_INVALIDO', descripcion: 'NIT con formato o dígito de verificación inválido', severidad: 'BLOQUEANTE' },
  { codigo: 'DUPLICADO_DOCUMENTO', descripcion: 'Mismo tercero, número y tipo que otro documento existente', severidad: 'BLOQUEANTE' },
  { codigo: 'IMPUESTO_INCONSISTENTE', descripcion: 'La suma de impuestos detallados no coincide con el total declarado', severidad: 'ADVERTENCIA' },
]

async function seedRoles() {
  for (const rol of ROLES) {
    await prisma.rol.upsert({
      where: { codigo: rol.codigo },
      update: { nombre: rol.nombre },
      create: rol,
    })
  }
  console.log(`Roles: ${ROLES.length} sincronizados`)
}

async function seedImpuestos() {
  for (const impuesto of IMPUESTOS) {
    await prisma.impuesto.upsert({
      where: { codigo: impuesto.codigo },
      update: { nombre: impuesto.nombre, porcentaje: impuesto.porcentaje },
      create: impuesto,
    })
  }
  console.log(`Impuestos: ${IMPUESTOS.length} sincronizados`)
}

async function seedReglasValidacion() {
  for (const regla of REGLAS_VALIDACION) {
    await prisma.reglaValidacion.upsert({
      where: { codigo: regla.codigo },
      update: { descripcion: regla.descripcion, severidad: regla.severidad },
      create: regla,
    })
  }
  console.log(`Reglas de validación: ${REGLAS_VALIDACION.length} sincronizadas`)
}

async function seedAdminDemo() {
  const email = process.env.SEED_ADMIN_EMAIL
  const password = process.env.SEED_ADMIN_PASSWORD
  const nit = process.env.SEED_EMPRESA_NIT
  const razonSocial = process.env.SEED_EMPRESA_RAZON_SOCIAL

  if (!email || !password || !nit || !razonSocial) {
    console.log('Seed de administrador de demo omitido (faltan variables SEED_* en .env)')
    return
  }

  const empresa = await prisma.empresa.upsert({
    where: { nit },
    update: {},
    create: { nit, razonSocial },
  })

  const rolAdmin = await prisma.rol.findUniqueOrThrow({ where: { codigo: 'ADMINISTRADOR' } })

  const passwordHash = await hashPassword(password)
  const usuario = await prisma.usuario.upsert({
    where: { email },
    update: {},
    create: { email, passwordHash, nombreCompleto: 'Administrador Demo' },
  })

  await prisma.usuarioEmpresaRol.upsert({
    where: {
      usuarioId_empresaId: {
        usuarioId: usuario.id,
        empresaId: empresa.id,
      },
    },
    update: {},
    create: { usuarioId: usuario.id, empresaId: empresa.id, rolId: rolAdmin.id },
  })

  console.log(`Usuario administrador de demo listo: ${email} / empresa "${razonSocial}"`)
}

async function main() {
  await seedRoles()
  await seedImpuestos()
  await seedReglasValidacion()
  await seedAdminDemo()
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
