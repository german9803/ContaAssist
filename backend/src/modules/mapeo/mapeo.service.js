import { prisma } from '../../shared/prisma.js'
import { registrarAuditoria } from '../../audit/audit.service.js'

class MapeoError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.status = status
  }
}

async function resolverSistemaDestino(codigo) {
  if (!codigo) throw new MapeoError('sistemaDestino es requerido (WORDOFFICE, SIIGO, EXCEL o CSV)')
  const sistema = await prisma.sistemaDestino.findUnique({ where: { codigo } })
  if (!sistema) throw new MapeoError(`Sistema destino "${codigo}" no existe`, 404)
  return sistema
}

// ── Cuentas y formas de pago: catálogos pequeños — se listan TODOS los
// internos de la empresa con su equivalencia (null si aún no se mapeó), para
// que la pantalla de Mapeo muestre de una vez qué falta por completar.

export async function listarMapeoCuentas({ empresaId, sistemaDestinoCodigo }) {
  const sistema = await resolverSistemaDestino(sistemaDestinoCodigo)
  const [cuentas, mapeos] = await Promise.all([
    prisma.cuentaContable.findMany({ where: { empresaId }, orderBy: { codigo: 'asc' } }),
    prisma.mapeoCuenta.findMany({ where: { empresaId, sistemaDestinoId: sistema.id } }),
  ])
  const porCuenta = new Map(mapeos.map((m) => [m.cuentaContableId, m.codigoDestino]))
  return cuentas.map((c) => ({
    cuentaContableId: c.id,
    codigo: c.codigo,
    nombre: c.nombre,
    codigoDestino: porCuenta.get(c.id) ?? null,
  }))
}

export async function upsertMapeoCuenta({ empresaId, usuarioId, sistemaDestinoCodigo, cuentaContableId, codigoDestino }) {
  const sistema = await resolverSistemaDestino(sistemaDestinoCodigo)
  if (!codigoDestino?.trim()) throw new MapeoError('codigoDestino es requerido')

  const cuenta = await prisma.cuentaContable.findFirst({ where: { id: cuentaContableId, empresaId } })
  if (!cuenta) throw new MapeoError('Cuenta contable no encontrada', 404)

  const mapeo = await prisma.mapeoCuenta.upsert({
    where: { empresaId_sistemaDestinoId_cuentaContableId: { empresaId, sistemaDestinoId: sistema.id, cuentaContableId } },
    update: { codigoDestino },
    create: { empresaId, sistemaDestinoId: sistema.id, cuentaContableId, codigoDestino },
  })

  await registrarAuditoria({
    empresaId,
    usuarioId,
    accion: 'MAPEAR_CUENTA',
    entidad: 'mapeo_cuenta',
    entidadId: mapeo.id,
    campo: sistema.codigo,
    valorNuevo: `${cuenta.codigo} → ${codigoDestino}`,
  })

  return { cuentaContableId, codigo: cuenta.codigo, nombre: cuenta.nombre, codigoDestino }
}

export async function listarMapeoFormasPago({ empresaId, sistemaDestinoCodigo }) {
  const sistema = await resolverSistemaDestino(sistemaDestinoCodigo)
  const [formas, mapeos] = await Promise.all([
    prisma.formaPago.findMany({ where: { empresaId }, orderBy: { codigo: 'asc' } }),
    prisma.mapeoFormaPago.findMany({ where: { empresaId, sistemaDestinoId: sistema.id } }),
  ])
  const porForma = new Map(mapeos.map((m) => [m.formaPagoId, m.codigoDestino]))
  return formas.map((f) => ({
    formaPagoId: f.id,
    codigo: f.codigo,
    nombre: f.nombre,
    codigoDestino: porForma.get(f.id) ?? null,
  }))
}

export async function upsertMapeoFormaPago({ empresaId, usuarioId, sistemaDestinoCodigo, formaPagoId, codigoDestino }) {
  const sistema = await resolverSistemaDestino(sistemaDestinoCodigo)
  if (!codigoDestino?.trim()) throw new MapeoError('codigoDestino es requerido')

  const forma = await prisma.formaPago.findFirst({ where: { id: formaPagoId, empresaId } })
  if (!forma) throw new MapeoError('Forma de pago no encontrada', 404)

  const mapeo = await prisma.mapeoFormaPago.upsert({
    where: { empresaId_sistemaDestinoId_formaPagoId: { empresaId, sistemaDestinoId: sistema.id, formaPagoId } },
    update: { codigoDestino },
    create: { empresaId, sistemaDestinoId: sistema.id, formaPagoId, codigoDestino },
  })

  await registrarAuditoria({
    empresaId,
    usuarioId,
    accion: 'MAPEAR_FORMA_PAGO',
    entidad: 'mapeo_forma_pago',
    entidadId: mapeo.id,
    campo: sistema.codigo,
    valorNuevo: `${forma.codigo} → ${codigoDestino}`,
  })

  return { formaPagoId, codigo: forma.codigo, nombre: forma.nombre, codigoDestino }
}

// ── Terceros: catálogo potencialmente grande — se listan solo los ya
// mapeados; para agregar uno nuevo se busca el tercero (Fase 10) y se manda
// su id directamente.

export async function listarMapeoTerceros({ empresaId, sistemaDestinoCodigo }) {
  const sistema = await resolverSistemaDestino(sistemaDestinoCodigo)
  const mapeos = await prisma.mapeoTercero.findMany({
    where: { empresaId, sistemaDestinoId: sistema.id },
    include: { tercero: true },
    orderBy: { tercero: { razonSocial: 'asc' } },
  })
  return mapeos.map((m) => ({
    terceroId: m.terceroId,
    identificacion: m.tercero.identificacion,
    razonSocial: m.tercero.razonSocial,
    codigoDestino: m.codigoDestino,
  }))
}

export async function upsertMapeoTercero({ empresaId, usuarioId, sistemaDestinoCodigo, terceroId, codigoDestino }) {
  const sistema = await resolverSistemaDestino(sistemaDestinoCodigo)
  if (!codigoDestino?.trim()) throw new MapeoError('codigoDestino es requerido')

  const tercero = await prisma.tercero.findFirst({ where: { id: terceroId, empresaId } })
  if (!tercero) throw new MapeoError('Tercero no encontrado', 404)

  const mapeo = await prisma.mapeoTercero.upsert({
    where: { empresaId_sistemaDestinoId_terceroId: { empresaId, sistemaDestinoId: sistema.id, terceroId } },
    update: { codigoDestino },
    create: { empresaId, sistemaDestinoId: sistema.id, terceroId, codigoDestino },
  })

  await registrarAuditoria({
    empresaId,
    usuarioId,
    accion: 'MAPEAR_TERCERO',
    entidad: 'mapeo_tercero',
    entidadId: mapeo.id,
    campo: sistema.codigo,
    valorNuevo: `${tercero.razonSocial} → ${codigoDestino}`,
  })

  return { terceroId, identificacion: tercero.identificacion, razonSocial: tercero.razonSocial, codigoDestino }
}

// ── Bodegas: catálogo chico — se listan TODAS las de la empresa con su
// equivalencia (null si aún no se mapeó), igual que cuentas/formas de pago.

export async function listarMapeoBodegas({ empresaId, sistemaDestinoCodigo }) {
  const sistema = await resolverSistemaDestino(sistemaDestinoCodigo)
  const [bodegas, mapeos] = await Promise.all([
    prisma.bodega.findMany({ where: { empresaId }, orderBy: { codigo: 'asc' } }),
    prisma.mapeoBodega.findMany({ where: { empresaId, sistemaDestinoId: sistema.id } }),
  ])
  const porBodega = new Map(mapeos.map((m) => [m.bodegaId, m.codigoDestino]))
  return bodegas.map((b) => ({
    bodegaId: b.id,
    codigo: b.codigo,
    nombre: b.nombre,
    codigoDestino: porBodega.get(b.id) ?? null,
  }))
}

export async function upsertMapeoBodega({ empresaId, usuarioId, sistemaDestinoCodigo, bodegaId, codigoDestino }) {
  const sistema = await resolverSistemaDestino(sistemaDestinoCodigo)
  if (!codigoDestino?.trim()) throw new MapeoError('codigoDestino es requerido')

  const bodega = await prisma.bodega.findFirst({ where: { id: bodegaId, empresaId } })
  if (!bodega) throw new MapeoError('Bodega no encontrada', 404)

  const mapeo = await prisma.mapeoBodega.upsert({
    where: { empresaId_sistemaDestinoId_bodegaId: { empresaId, sistemaDestinoId: sistema.id, bodegaId } },
    update: { codigoDestino },
    create: { empresaId, sistemaDestinoId: sistema.id, bodegaId, codigoDestino },
  })

  await registrarAuditoria({
    empresaId,
    usuarioId,
    accion: 'MAPEAR_BODEGA',
    entidad: 'mapeo_bodega',
    entidadId: mapeo.id,
    campo: sistema.codigo,
    valorNuevo: `${bodega.codigo} → ${codigoDestino}`,
  })

  return { bodegaId, codigo: bodega.codigo, nombre: bodega.nombre, codigoDestino }
}

// ── Productos: catálogo potencialmente grande — mismo patrón que terceros
// (solo se listan los ya mapeados; uno nuevo se agrega por búsqueda+id).

export async function listarMapeoProductos({ empresaId, sistemaDestinoCodigo }) {
  const sistema = await resolverSistemaDestino(sistemaDestinoCodigo)
  const mapeos = await prisma.mapeoProducto.findMany({
    where: { empresaId, sistemaDestinoId: sistema.id },
    include: { producto: true },
    orderBy: { producto: { nombre: 'asc' } },
  })
  return mapeos.map((m) => ({
    productoId: m.productoId,
    codigo: m.producto.codigo,
    nombre: m.producto.nombre,
    codigoDestino: m.codigoDestino,
  }))
}

export async function upsertMapeoProducto({ empresaId, usuarioId, sistemaDestinoCodigo, productoId, codigoDestino }) {
  const sistema = await resolverSistemaDestino(sistemaDestinoCodigo)
  if (!codigoDestino?.trim()) throw new MapeoError('codigoDestino es requerido')

  const producto = await prisma.producto.findFirst({ where: { id: productoId, empresaId } })
  if (!producto) throw new MapeoError('Producto no encontrado', 404)

  const mapeo = await prisma.mapeoProducto.upsert({
    where: { empresaId_sistemaDestinoId_productoId: { empresaId, sistemaDestinoId: sistema.id, productoId } },
    update: { codigoDestino },
    create: { empresaId, sistemaDestinoId: sistema.id, productoId, codigoDestino },
  })

  await registrarAuditoria({
    empresaId,
    usuarioId,
    accion: 'MAPEAR_PRODUCTO',
    entidad: 'mapeo_producto',
    entidadId: mapeo.id,
    campo: sistema.codigo,
    valorNuevo: `${producto.codigo || producto.nombre} → ${codigoDestino}`,
  })

  return { productoId, codigo: producto.codigo, nombre: producto.nombre, codigoDestino }
}

export { MapeoError }
