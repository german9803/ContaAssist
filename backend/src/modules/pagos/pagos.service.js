import { prisma } from '../../shared/prisma.js'
import { registrarAuditoria } from '../../audit/audit.service.js'

// Mismo criterio de tolerancia de redondeo que TOTAL_DESCUADRADO (validation-engine).
const TOLERANCIA = 1
// Documentos ya aprobados en adelante pueden pagarse — uno EXPORTADO igual
// puede pagarse después en la vida real (exportar y pagar son cosas distintas).
const ESTADOS_ELEGIBLES = ['APROBADO', 'LISTO_PARA_EXPORTAR', 'EXPORTADO']
const TIPO_A_TIPO_DOCUMENTO = { PAGO: 'FACTURA_COMPRA', RECAUDO: 'FACTURA_VENTA' }
const TIPOS_VALIDOS = Object.keys(TIPO_A_TIPO_DOCUMENTO)

class PagoError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.status = status
  }
}

function validarTipo(tipo) {
  if (!TIPOS_VALIDOS.includes(tipo)) {
    throw new PagoError(`tipo debe ser uno de: ${TIPOS_VALIDOS.join(', ')}`)
  }
}

// Pura, sin acceso a datos — testeable en aislamiento. `hoy` es inyectable
// para que los tests no dependan de la fecha real del sistema.
export function calcularEstadoPago({ total, aplicado, fechaVencimiento, hoy = new Date() }) {
  const saldoPendiente = Math.max(0, Number(total ?? 0) - aplicado)
  const estadoCartera = saldoPendiente <= TOLERANCIA ? 'PAGADO' : aplicado > 0 ? 'PARCIAL' : 'PENDIENTE'
  const vencido = estadoCartera !== 'PAGADO' && !!fechaVencimiento && new Date(fechaVencimiento) < hoy
  return { saldoPendiente, estadoCartera, vencido }
}

function serializarPago(p) {
  return {
    id: p.id,
    tipo: p.tipo,
    tercero: p.tercero ? { id: p.tercero.id, identificacion: p.tercero.identificacion, razonSocial: p.tercero.razonSocial } : undefined,
    fecha: p.fecha,
    valor: p.valor,
    formaPago: p.formaPago ? { id: p.formaPago.id, codigo: p.formaPago.codigo, nombre: p.formaPago.nombre } : null,
    cuentaBancaria: p.cuentaBancaria
      ? { id: p.cuentaBancaria.id, banco: p.cuentaBancaria.banco, numeroCuenta: p.cuentaBancaria.numeroCuenta }
      : null,
    observaciones: p.observaciones,
    estado: p.estado,
    aplicaciones: p.aplicaciones
      ? p.aplicaciones.map((a) => ({
          documentoId: a.documentoId,
          valorAplicado: a.valorAplicado,
          documento: a.documento
            ? {
                id: a.documento.id,
                tipoDocumento: a.documento.tipoDocumento,
                numeroDocumento: a.documento.numeroDocumento,
                total: a.documento.total,
              }
            : undefined,
        }))
      : undefined,
    creadoEn: p.creadoEn,
  }
}

// Suma lo aplicado por pagos en estado REGISTRADO a un conjunto de documentos
// (los ANULADOS no cuentan — ver regla de negocio en el plan de Fase 15).
async function sumasAplicadasPorDocumento(documentoIds) {
  if (documentoIds.length === 0) return new Map()
  const filas = await prisma.pagoDocumento.findMany({
    where: { documentoId: { in: documentoIds }, pago: { estado: 'REGISTRADO' } },
    select: { documentoId: true, valorAplicado: true },
  })
  const mapa = new Map()
  for (const fila of filas) {
    mapa.set(fila.documentoId, (mapa.get(fila.documentoId) ?? 0) + Number(fila.valorAplicado))
  }
  return mapa
}

async function documentosConSaldo({ empresaId, tipo, tercero, fechaDesde, fechaHasta }) {
  validarTipo(tipo)
  const tipoDocumento = TIPO_A_TIPO_DOCUMENTO[tipo]

  const fechaEmision = {}
  if (fechaDesde) fechaEmision.gte = new Date(fechaDesde)
  if (fechaHasta) fechaEmision.lte = new Date(fechaHasta)

  const documentos = await prisma.documento.findMany({
    where: {
      empresaId,
      tipoDocumento,
      estado: { in: ESTADOS_ELEGIBLES },
      ...(Object.keys(fechaEmision).length > 0 ? { fechaEmision } : {}),
      ...(tercero
        ? {
            tercero: {
              OR: [
                { razonSocial: { contains: tercero, mode: 'insensitive' } },
                { identificacion: { contains: tercero } },
              ],
            },
          }
        : {}),
    },
    include: { tercero: true },
    orderBy: { fechaVencimiento: 'asc' },
  })

  const aplicado = await sumasAplicadasPorDocumento(documentos.map((d) => d.id))
  const hoy = new Date()

  return documentos.map((doc) => {
    const { saldoPendiente, estadoCartera, vencido } = calcularEstadoPago({
      total: doc.total,
      aplicado: aplicado.get(doc.id) ?? 0,
      fechaVencimiento: doc.fechaVencimiento,
      hoy,
    })
    return {
      id: doc.id,
      tipoDocumento: doc.tipoDocumento,
      numeroDocumento: doc.numeroDocumento,
      prefijo: doc.prefijo,
      fechaEmision: doc.fechaEmision,
      fechaVencimiento: doc.fechaVencimiento,
      total: doc.total,
      tercero: doc.tercero
        ? { id: doc.tercero.id, identificacion: doc.tercero.identificacion, razonSocial: doc.tercero.razonSocial }
        : null,
      saldoPendiente,
      estadoCartera,
      vencido,
    }
  })
}

// Documentos elegibles (FACTURA_COMPRA/FACTURA_VENTA según `tipo`) con su
// saldo pendiente y estado de cartera calculados — no persistidos, ver
// docs/database.md §10.
export async function listarDocumentosConSaldo({ empresaId, tipo, estadoCartera, tercero, fechaDesde, fechaHasta, page = 1, pageSize = 20 }) {
  let resultado = await documentosConSaldo({ empresaId, tipo, tercero, fechaDesde, fechaHasta })
  if (estadoCartera) resultado = resultado.filter((d) => d.estadoCartera === estadoCartera)

  const total = resultado.length
  return { data: resultado.slice((page - 1) * pageSize, page * pageSize), total, page, pageSize }
}

export async function obtenerResumenCartera({ empresaId, tipo, fechaDesde, fechaHasta }) {
  const documentos = await documentosConSaldo({ empresaId, tipo, fechaDesde, fechaHasta })
  const pendientes = documentos.filter((d) => d.estadoCartera !== 'PAGADO')
  const vencidos = documentos.filter((d) => d.vencido)
  return {
    totalPendiente: pendientes.reduce((acc, d) => acc + d.saldoPendiente, 0),
    totalVencido: vencidos.reduce((acc, d) => acc + d.saldoPendiente, 0),
    cantidadPendientes: pendientes.length,
    cantidadVencidos: vencidos.length,
  }
}

export async function registrarPago({
  empresaId,
  usuarioId,
  tipo,
  terceroId,
  fecha,
  valor,
  formaPagoId,
  cuentaBancariaId,
  observaciones,
  aplicaciones,
}) {
  validarTipo(tipo)
  const tipoDocumento = TIPO_A_TIPO_DOCUMENTO[tipo]

  if (!terceroId) throw new PagoError('terceroId es requerido')
  if (!fecha) throw new PagoError('fecha es requerida')
  const valorNum = Number(valor)
  if (!Number.isFinite(valorNum) || valorNum <= 0) throw new PagoError('valor debe ser un número mayor a 0')
  if (!Array.isArray(aplicaciones) || aplicaciones.length === 0) {
    throw new PagoError('aplicaciones es requerido (al menos un documento)')
  }

  const tercero = await prisma.tercero.findFirst({ where: { id: terceroId, empresaId } })
  if (!tercero) throw new PagoError('Tercero no encontrado', 404)

  if (formaPagoId) {
    const forma = await prisma.formaPago.findFirst({ where: { id: formaPagoId, empresaId } })
    if (!forma) throw new PagoError('Forma de pago no encontrada', 404)
  }

  if (cuentaBancariaId) {
    const cuenta = await prisma.cuentaBancaria.findFirst({ where: { id: cuentaBancariaId, empresaId } })
    if (!cuenta) throw new PagoError('Cuenta bancaria no encontrada', 404)
  }

  const documentoIds = aplicaciones.map((a) => a.documentoId)
  const documentos = await prisma.documento.findMany({ where: { id: { in: documentoIds }, empresaId } })
  if (documentos.length !== new Set(documentoIds).size) {
    throw new PagoError('Alguno de los documentos no existe en esta empresa', 404)
  }
  const documentosPorId = new Map(documentos.map((d) => [d.id, d]))
  const aplicadoPrevio = await sumasAplicadasPorDocumento(documentoIds)

  let sumaAplicaciones = 0
  for (const aplicacion of aplicaciones) {
    const documento = documentosPorId.get(aplicacion.documentoId)
    const etiquetaDoc = documento.numeroDocumento ?? documento.id
    const valorAplicado = Number(aplicacion.valorAplicado)
    if (!Number.isFinite(valorAplicado) || valorAplicado <= 0) {
      throw new PagoError(`valorAplicado inválido para el documento ${etiquetaDoc}`)
    }
    if (documento.tipoDocumento !== tipoDocumento) {
      throw new PagoError(`El documento ${etiquetaDoc} no es de tipo ${tipoDocumento}`)
    }
    if (documento.terceroId !== terceroId) {
      throw new PagoError(`El documento ${etiquetaDoc} no pertenece a este tercero`)
    }
    if (!ESTADOS_ELEGIBLES.includes(documento.estado)) {
      throw new PagoError(`El documento ${etiquetaDoc} no está en un estado elegible para pago (${documento.estado})`)
    }

    const yaAplicado = aplicadoPrevio.get(aplicacion.documentoId) ?? 0
    const saldoDisponible = Number(documento.total ?? 0) - yaAplicado
    if (valorAplicado > saldoDisponible + TOLERANCIA) {
      throw new PagoError(
        `El valor aplicado al documento ${etiquetaDoc} (${valorAplicado}) supera su saldo pendiente (${saldoDisponible.toFixed(2)})`,
        409,
      )
    }
    sumaAplicaciones += valorAplicado
  }

  if (Math.abs(sumaAplicaciones - valorNum) > TOLERANCIA) {
    throw new PagoError(
      `La suma de lo aplicado a los documentos (${sumaAplicaciones.toFixed(2)}) debe ser igual al valor del pago (${valorNum.toFixed(2)})`,
    )
  }

  const pago = await prisma.pago.create({
    data: {
      empresaId,
      usuarioId,
      tipo,
      terceroId,
      fecha: new Date(fecha),
      valor: valorNum,
      formaPagoId: formaPagoId || null,
      cuentaBancariaId: cuentaBancariaId || null,
      observaciones: observaciones || null,
      estado: 'REGISTRADO',
      aplicaciones: { create: aplicaciones.map((a) => ({ documentoId: a.documentoId, valorAplicado: Number(a.valorAplicado) })) },
    },
    include: { tercero: true, formaPago: true, cuentaBancaria: true, aplicaciones: { include: { documento: true } } },
  })

  await registrarAuditoria({
    empresaId,
    usuarioId,
    accion: tipo === 'PAGO' ? 'REGISTRAR_PAGO' : 'REGISTRAR_RECAUDO',
    entidad: 'pago',
    entidadId: pago.id,
    valorNuevo: `${tercero.razonSocial} — ${valorNum}`,
  })

  return serializarPago(pago)
}

export async function listarPagos({ empresaId, tipo, terceroId, page = 1, pageSize = 20 }) {
  const where = { empresaId, ...(tipo ? { tipo } : {}), ...(terceroId ? { terceroId } : {}) }
  const [total, pagos] = await Promise.all([
    prisma.pago.count({ where }),
    prisma.pago.findMany({
      where,
      include: { tercero: true, formaPago: true, cuentaBancaria: true },
      orderBy: { fecha: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])
  return { data: pagos.map(serializarPago), total, page, pageSize }
}

export async function obtenerPago({ empresaId, pagoId }) {
  const pago = await prisma.pago.findFirst({
    where: { id: pagoId, empresaId },
    include: { tercero: true, formaPago: true, cuentaBancaria: true, aplicaciones: { include: { documento: true } } },
  })
  if (!pago) throw new PagoError('Pago no encontrado', 404)
  return serializarPago(pago)
}

export async function anularPago({ empresaId, pagoId, usuarioId }) {
  const pago = await prisma.pago.findFirst({ where: { id: pagoId, empresaId } })
  if (!pago) throw new PagoError('Pago no encontrado', 404)
  if (pago.estado === 'ANULADO') throw new PagoError('El pago ya está anulado', 409)

  const actualizado = await prisma.pago.update({
    where: { id: pagoId },
    data: { estado: 'ANULADO' },
    include: { tercero: true, formaPago: true, cuentaBancaria: true, aplicaciones: { include: { documento: true } } },
  })

  await registrarAuditoria({
    empresaId,
    usuarioId,
    accion: pago.tipo === 'PAGO' ? 'ANULAR_PAGO' : 'ANULAR_RECAUDO',
    entidad: 'pago',
    entidadId: pagoId,
    campo: 'estado',
    valorAnterior: 'REGISTRADO',
    valorNuevo: 'ANULADO',
  })

  return serializarPago(actualizado)
}

export { PagoError }
