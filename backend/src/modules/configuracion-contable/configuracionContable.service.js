import { prisma } from '../../shared/prisma.js'
import { registrarAuditoria } from '../../audit/audit.service.js'

class ConfigError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.status = status
  }
}

function serializarCuenta(c) {
  return { id: c.id, codigo: c.codigo, nombre: c.nombre, naturaleza: c.naturaleza, activa: c.activa }
}
function serializarCentro(c) {
  return { id: c.id, codigo: c.codigo, nombre: c.nombre, activo: c.activo }
}
function serializarFormaPago(f) {
  return { id: f.id, codigo: f.codigo, nombre: f.nombre }
}

// ── Cuentas contables ────────────────────────────────────────────────────────

export async function listarCuentasContables({ empresaId }) {
  const cuentas = await prisma.cuentaContable.findMany({ where: { empresaId }, orderBy: { codigo: 'asc' } })
  return cuentas.map(serializarCuenta)
}

export async function crearCuentaContable({ empresaId, usuarioId, datos }) {
  const { codigo, nombre, naturaleza } = datos
  if (!codigo?.trim()) throw new ConfigError('codigo es requerido')
  if (!nombre?.trim()) throw new ConfigError('nombre es requerido')
  if (!['DEBITO', 'CREDITO'].includes(naturaleza)) throw new ConfigError('naturaleza debe ser DEBITO o CREDITO')

  const yaExiste = await prisma.cuentaContable.findUnique({ where: { empresaId_codigo: { empresaId, codigo } } })
  if (yaExiste) throw new ConfigError(`Ya existe una cuenta contable con código ${codigo}`, 409)

  const cuenta = await prisma.cuentaContable.create({ data: { empresaId, codigo, nombre, naturaleza } })
  await registrarAuditoria({
    empresaId,
    usuarioId,
    accion: 'CREAR_CUENTA_CONTABLE',
    entidad: 'cuenta_contable',
    entidadId: cuenta.id,
    valorNuevo: `${codigo} — ${nombre}`,
  })
  return serializarCuenta(cuenta)
}

// ── Centros de costo ─────────────────────────────────────────────────────────

export async function listarCentrosCosto({ empresaId }) {
  const centros = await prisma.centroCosto.findMany({ where: { empresaId }, orderBy: { codigo: 'asc' } })
  return centros.map(serializarCentro)
}

export async function crearCentroCosto({ empresaId, usuarioId, datos }) {
  const { codigo, nombre } = datos
  if (!codigo?.trim()) throw new ConfigError('codigo es requerido')
  if (!nombre?.trim()) throw new ConfigError('nombre es requerido')

  const yaExiste = await prisma.centroCosto.findUnique({ where: { empresaId_codigo: { empresaId, codigo } } })
  if (yaExiste) throw new ConfigError(`Ya existe un centro de costo con código ${codigo}`, 409)

  const centro = await prisma.centroCosto.create({ data: { empresaId, codigo, nombre } })
  await registrarAuditoria({
    empresaId,
    usuarioId,
    accion: 'CREAR_CENTRO_COSTO',
    entidad: 'centro_costo',
    entidadId: centro.id,
    valorNuevo: `${codigo} — ${nombre}`,
  })
  return serializarCentro(centro)
}

// ── Formas de pago ───────────────────────────────────────────────────────────

export async function listarFormasPago({ empresaId }) {
  const formas = await prisma.formaPago.findMany({ where: { empresaId }, orderBy: { codigo: 'asc' } })
  return formas.map(serializarFormaPago)
}

export async function crearFormaPago({ empresaId, usuarioId, datos }) {
  const { codigo, nombre } = datos
  if (!codigo?.trim()) throw new ConfigError('codigo es requerido')
  if (!nombre?.trim()) throw new ConfigError('nombre es requerido')

  const yaExiste = await prisma.formaPago.findUnique({ where: { empresaId_codigo: { empresaId, codigo } } })
  if (yaExiste) throw new ConfigError(`Ya existe una forma de pago con código ${codigo}`, 409)

  const forma = await prisma.formaPago.create({ data: { empresaId, codigo, nombre } })
  await registrarAuditoria({
    empresaId,
    usuarioId,
    accion: 'CREAR_FORMA_PAGO',
    entidad: 'forma_pago',
    entidadId: forma.id,
    valorNuevo: `${codigo} — ${nombre}`,
  })
  return serializarFormaPago(forma)
}

// ── Sistemas destino (catálogo global, solo lectura desde esta API) ─────────

export async function listarSistemasDestino() {
  const sistemas = await prisma.sistemaDestino.findMany({ orderBy: { codigo: 'asc' } })
  return sistemas.map((s) => ({ id: s.id, codigo: s.codigo, nombre: s.nombre, versionFormatoActual: s.versionFormatoActual }))
}

export { ConfigError }
