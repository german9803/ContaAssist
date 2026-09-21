import { prisma } from '../../shared/prisma.js'
import { registrarAuditoria } from '../../audit/audit.service.js'
import { parsearExtractoCsv, parsearExtractoXlsx } from './extractoParser.js'

const TIPOS_CUENTA_VALIDOS = ['AHORROS', 'CORRIENTE']
// Tolerancias para SUGERIR una conciliación — nunca deciden por sí solas
// (el usuario siempre confirma cuál pago corresponde a cada línea).
const TOLERANCIA_VALOR = 1 // pesos, redondeo — mismo criterio que TOTAL_DESCUADRADO
const TOLERANCIA_DIAS_FECHA = 5

class BancoError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.status = status
  }
}

// Pura y testeable en aislamiento: suma lo que entró/salió de cada cuenta —
// RECAUDO suma, PAGO resta, igual que un extracto real.
export function sumarMovimientosPorCuenta(pagos) {
  const mapa = new Map()
  for (const pago of pagos) {
    const signo = pago.tipo === 'RECAUDO' ? 1 : -1
    mapa.set(pago.cuentaBancariaId, (mapa.get(pago.cuentaBancariaId) ?? 0) + signo * Number(pago.valor))
  }
  return mapa
}

// Cuentas sin ningún pago asociado simplemente no aparecen en el mapa (su
// saldo queda en saldoInicial).
async function movimientosPorCuenta(empresaId) {
  const pagos = await prisma.pago.findMany({
    where: { empresaId, estado: 'REGISTRADO', cuentaBancariaId: { not: null } },
    select: { cuentaBancariaId: true, tipo: true, valor: true },
  })
  return sumarMovimientosPorCuenta(pagos)
}

function serializarCuenta(c, movimiento) {
  return {
    id: c.id,
    banco: c.banco,
    numeroCuenta: c.numeroCuenta,
    tipoCuenta: c.tipoCuenta,
    saldoInicial: c.saldoInicial,
    moneda: c.moneda,
    activa: c.activa,
    saldo: Number(c.saldoInicial) + (movimiento ?? 0),
  }
}

export async function listarCuentasBancarias({ empresaId }) {
  const [cuentas, movimientos] = await Promise.all([
    prisma.cuentaBancaria.findMany({ where: { empresaId }, orderBy: { banco: 'asc' } }),
    movimientosPorCuenta(empresaId),
  ])
  return cuentas.map((c) => serializarCuenta(c, movimientos.get(c.id)))
}

export async function crearCuentaBancaria({ empresaId, usuarioId, datos }) {
  const { banco, numeroCuenta, tipoCuenta, saldoInicial, moneda } = datos
  if (!banco?.trim()) throw new BancoError('banco es requerido')
  if (!numeroCuenta?.trim()) throw new BancoError('numeroCuenta es requerido')
  if (!TIPOS_CUENTA_VALIDOS.includes(tipoCuenta)) {
    throw new BancoError(`tipoCuenta debe ser uno de: ${TIPOS_CUENTA_VALIDOS.join(', ')}`)
  }

  const yaExiste = await prisma.cuentaBancaria.findUnique({
    where: { empresaId_banco_numeroCuenta: { empresaId, banco, numeroCuenta } },
  })
  if (yaExiste) throw new BancoError(`Ya existe una cuenta de ${banco} con número ${numeroCuenta}`, 409)

  const cuenta = await prisma.cuentaBancaria.create({
    data: {
      empresaId,
      banco,
      numeroCuenta,
      tipoCuenta,
      saldoInicial: saldoInicial ? Number(saldoInicial) : 0,
      moneda: moneda || 'COP',
    },
  })

  await registrarAuditoria({
    empresaId,
    usuarioId,
    accion: 'CREAR_CUENTA_BANCARIA',
    entidad: 'cuenta_bancaria',
    entidadId: cuenta.id,
    valorNuevo: `${banco} — ${numeroCuenta}`,
  })

  return serializarCuenta(cuenta, 0)
}

// ── Extractos bancarios y conciliación ───────────────────────────────────────

function serializarExtracto(e) {
  return {
    id: e.id,
    cuentaBancariaId: e.cuentaBancariaId,
    periodoInicio: e.periodoInicio,
    periodoFin: e.periodoFin,
    cantidadLineas: e.cantidadLineas,
    creadoEn: e.creadoEn,
  }
}

function serializarLinea(l, sugerencias) {
  return {
    id: l.id,
    fecha: l.fecha,
    descripcion: l.descripcion,
    debito: l.debito,
    credito: l.credito,
    conciliado: l.pagoId !== null,
    pago: l.pago
      ? {
          id: l.pago.id,
          tipo: l.pago.tipo,
          valor: l.pago.valor,
          tercero: l.pago.tercero ? { id: l.pago.tercero.id, razonSocial: l.pago.tercero.razonSocial } : null,
        }
      : null,
    sugerencias,
  }
}

export async function importarExtracto({ empresaId, usuarioId, cuentaBancariaId, nombreArchivo, buffer }) {
  const cuenta = await prisma.cuentaBancaria.findFirst({ where: { id: cuentaBancariaId, empresaId } })
  if (!cuenta) throw new BancoError('Cuenta bancaria no encontrada', 404)
  if (!buffer?.length) throw new BancoError('Archivo vacío')

  const esXlsx = /\.xlsx$/i.test(nombreArchivo || '')
  const filas = esXlsx ? await parsearExtractoXlsx(buffer) : parsearExtractoCsv(buffer)

  const validas = filas.filter((f) => f.valido)
  const invalidas = filas.filter((f) => !f.valido)
  if (validas.length === 0) {
    throw new BancoError(
      `El archivo no tiene líneas válidas. Errores: ${invalidas.map((f) => `fila ${f.fila}: ${f.errores.join('; ')}`).join(' | ')}`,
    )
  }

  const fechas = validas.map((f) => f.fecha.getTime())
  const periodoInicio = new Date(Math.min(...fechas))
  const periodoFin = new Date(Math.max(...fechas))

  const extracto = await prisma.extracto.create({
    data: {
      empresaId,
      cuentaBancariaId,
      periodoInicio,
      periodoFin,
      cantidadLineas: validas.length,
      lineas: {
        create: validas.map((f) => ({ fecha: f.fecha, descripcion: f.descripcion, debito: f.debito, credito: f.credito })),
      },
    },
  })

  await registrarAuditoria({
    empresaId,
    usuarioId,
    accion: 'IMPORTAR_EXTRACTO',
    entidad: 'extracto',
    entidadId: extracto.id,
    valorNuevo: `${cuenta.banco} — ${validas.length} líneas`,
  })

  return {
    extracto: serializarExtracto(extracto),
    erroresFilas: invalidas.map((f) => ({ fila: f.fila, errores: f.errores })),
  }
}

export async function listarExtractos({ empresaId, cuentaBancariaId }) {
  const extractos = await prisma.extracto.findMany({
    where: { empresaId, ...(cuentaBancariaId ? { cuentaBancariaId } : {}) },
    orderBy: { creadoEn: 'desc' },
  })
  return extractos.map(serializarExtracto)
}

// Solo SUGIERE — el pago candidato debe tener el tipo correcto según el lado
// del movimiento (débito → PAGO, crédito → RECAUDO), estar en la misma
// cuenta, sin conciliar todavía, y dentro de una tolerancia de valor/fecha.
// El usuario siempre confirma antes de conciliar.
async function sugerirPagos({ empresaId, cuentaBancariaId, linea }) {
  const esDebito = Number(linea.debito) > 0
  const tipo = esDebito ? 'PAGO' : 'RECAUDO'
  const valor = esDebito ? Number(linea.debito) : Number(linea.credito)
  const desde = new Date(linea.fecha)
  desde.setDate(desde.getDate() - TOLERANCIA_DIAS_FECHA)
  const hasta = new Date(linea.fecha)
  hasta.setDate(hasta.getDate() + TOLERANCIA_DIAS_FECHA)

  const candidatos = await prisma.pago.findMany({
    where: {
      empresaId,
      cuentaBancariaId,
      tipo,
      estado: 'REGISTRADO',
      valor: { gte: valor - TOLERANCIA_VALOR, lte: valor + TOLERANCIA_VALOR },
      fecha: { gte: desde, lte: hasta },
      extractoLineas: { none: {} },
    },
    include: { tercero: true },
    take: 5,
  })

  return candidatos.map((p) => ({
    id: p.id,
    tipo: p.tipo,
    valor: p.valor,
    fecha: p.fecha,
    tercero: p.tercero ? { id: p.tercero.id, razonSocial: p.tercero.razonSocial } : null,
  }))
}

export async function obtenerExtracto({ empresaId, extractoId }) {
  const extracto = await prisma.extracto.findFirst({
    where: { id: extractoId, empresaId },
    include: { lineas: { include: { pago: { include: { tercero: true } } }, orderBy: { fecha: 'asc' } } },
  })
  if (!extracto) throw new BancoError('Extracto no encontrado', 404)

  const lineas = []
  for (const linea of extracto.lineas) {
    const sugerencias = linea.pagoId ? undefined : await sugerirPagos({ empresaId, cuentaBancariaId: extracto.cuentaBancariaId, linea })
    lineas.push(serializarLinea(linea, sugerencias))
  }

  return { ...serializarExtracto(extracto), lineas }
}

export async function conciliarLinea({ empresaId, usuarioId, lineaId, pagoId }) {
  const linea = await prisma.extractoLinea.findFirst({
    where: { id: lineaId, extracto: { empresaId } },
    include: { extracto: true },
  })
  if (!linea) throw new BancoError('Línea de extracto no encontrada', 404)
  if (linea.pagoId) throw new BancoError('Esta línea ya está conciliada', 409)
  if (!pagoId) throw new BancoError('pagoId es requerido')

  const pago = await prisma.pago.findFirst({ where: { id: pagoId, empresaId } })
  if (!pago) throw new BancoError('Pago no encontrado', 404)
  if (pago.estado !== 'REGISTRADO') throw new BancoError('El pago no está en estado REGISTRADO', 409)
  if (pago.cuentaBancariaId !== linea.extracto.cuentaBancariaId) {
    throw new BancoError('El pago pertenece a otra cuenta bancaria', 400)
  }

  const esDebito = Number(linea.debito) > 0
  const tipoEsperado = esDebito ? 'PAGO' : 'RECAUDO'
  if (pago.tipo !== tipoEsperado) {
    throw new BancoError(
      `Esta línea es un ${esDebito ? 'débito' : 'crédito'} del extracto — solo se puede conciliar con un ${tipoEsperado}`,
    )
  }

  const yaConciliado = await prisma.extractoLinea.findFirst({ where: { pagoId } })
  if (yaConciliado) throw new BancoError('Ese pago ya está conciliado con otra línea del extracto', 409)

  await prisma.extractoLinea.update({ where: { id: lineaId }, data: { pagoId } })

  await registrarAuditoria({
    empresaId,
    usuarioId,
    accion: 'CONCILIAR_EXTRACTO',
    entidad: 'extracto_linea',
    entidadId: lineaId,
    campo: 'pago_id',
    valorNuevo: pagoId,
  })

  return obtenerExtracto({ empresaId, extractoId: linea.extractoId })
}

export async function desconciliarLinea({ empresaId, usuarioId, lineaId }) {
  const linea = await prisma.extractoLinea.findFirst({ where: { id: lineaId, extracto: { empresaId } } })
  if (!linea) throw new BancoError('Línea de extracto no encontrada', 404)
  if (!linea.pagoId) throw new BancoError('Esta línea no está conciliada', 409)

  const pagoIdAnterior = linea.pagoId
  await prisma.extractoLinea.update({ where: { id: lineaId }, data: { pagoId: null } })

  await registrarAuditoria({
    empresaId,
    usuarioId,
    accion: 'DESCONCILIAR_EXTRACTO',
    entidad: 'extracto_linea',
    entidadId: lineaId,
    campo: 'pago_id',
    valorAnterior: pagoIdAnterior,
  })

  return obtenerExtracto({ empresaId, extractoId: linea.extractoId })
}

export { BancoError }
