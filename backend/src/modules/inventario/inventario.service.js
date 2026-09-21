import { prisma } from '../../shared/prisma.js'
import { registrarAuditoria } from '../../audit/audit.service.js'

class InventarioError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.status = status
  }
}

function serializarProducto(p) {
  return {
    id: p.id,
    codigo: p.codigo,
    nombre: p.nombre,
    unidadMedida: p.unidadMedida,
    cuentaContable: p.cuentaContable ? { id: p.cuentaContable.id, codigo: p.cuentaContable.codigo, nombre: p.cuentaContable.nombre } : null,
    activo: p.activo,
  }
}
function serializarBodega(b) {
  return { id: b.id, codigo: b.codigo, nombre: b.nombre, activa: b.activa }
}

// ── Productos ─────────────────────────────────────────────────────────────────
// A diferencia de cuentas/centros/formas de pago, `codigo` es opcional: un
// producto puede quedar creado automáticamente desde un documento (sin código
// propio todavía) y completarse después desde este catálogo.

export async function listarProductos({ empresaId, q }) {
  const productos = await prisma.producto.findMany({
    where: {
      empresaId,
      ...(q ? { OR: [{ nombre: { contains: q, mode: 'insensitive' } }, { codigo: { contains: q, mode: 'insensitive' } }] } : {}),
    },
    include: { cuentaContable: true },
    orderBy: { nombre: 'asc' },
  })
  return productos.map(serializarProducto)
}

export async function crearProducto({ empresaId, usuarioId, datos }) {
  const { codigo, nombre, unidadMedida, cuentaContableCodigo } = datos
  if (!nombre?.trim()) throw new InventarioError('nombre es requerido')

  if (codigo?.trim()) {
    const yaExiste = await prisma.producto.findUnique({ where: { empresaId_codigo: { empresaId, codigo } } })
    if (yaExiste) throw new InventarioError(`Ya existe un producto con código ${codigo}`, 409)
  }

  let cuentaContableId = null
  if (cuentaContableCodigo) {
    const cuenta = await prisma.cuentaContable.findUnique({ where: { empresaId_codigo: { empresaId, codigo: cuentaContableCodigo } } })
    if (!cuenta) throw new InventarioError(`Cuenta contable con código "${cuentaContableCodigo}" no existe en esta empresa`, 404)
    cuentaContableId = cuenta.id
  }

  const producto = await prisma.producto.create({
    data: { empresaId, codigo: codigo?.trim() || null, nombre, unidadMedida: unidadMedida || null, cuentaContableId },
    include: { cuentaContable: true },
  })
  await registrarAuditoria({
    empresaId,
    usuarioId,
    accion: 'CREAR_PRODUCTO',
    entidad: 'producto',
    entidadId: producto.id,
    valorNuevo: `${codigo || '(sin código)'} — ${nombre}`,
  })
  return serializarProducto(producto)
}

// ── Bodegas ───────────────────────────────────────────────────────────────────

export async function listarBodegas({ empresaId }) {
  const bodegas = await prisma.bodega.findMany({ where: { empresaId }, orderBy: { codigo: 'asc' } })
  return bodegas.map(serializarBodega)
}

export async function crearBodega({ empresaId, usuarioId, datos }) {
  const { codigo, nombre } = datos
  if (!codigo?.trim()) throw new InventarioError('codigo es requerido')
  if (!nombre?.trim()) throw new InventarioError('nombre es requerido')

  const yaExiste = await prisma.bodega.findUnique({ where: { empresaId_codigo: { empresaId, codigo } } })
  if (yaExiste) throw new InventarioError(`Ya existe una bodega con código ${codigo}`, 409)

  const bodega = await prisma.bodega.create({ data: { empresaId, codigo, nombre } })
  await registrarAuditoria({
    empresaId,
    usuarioId,
    accion: 'CREAR_BODEGA',
    entidad: 'bodega',
    entidadId: bodega.id,
    valorNuevo: `${codigo} — ${nombre}`,
  })
  return serializarBodega(bodega)
}

export { InventarioError }
