import 'dotenv/config'
import { prisma } from '../src/shared/prisma.js'
import { hashPassword } from '../src/authentication/password.js'

const ROLES = [
  { codigo: 'ADMINISTRADOR', nombre: 'Administrador' },
  { codigo: 'AUXILIAR_CONTABLE', nombre: 'Auxiliar contable' },
  { codigo: 'CONTADOR', nombre: 'Contador' },
  { codigo: 'CONSULTA', nombre: 'Consulta' },
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
