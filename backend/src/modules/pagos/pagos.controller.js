import {
  listarDocumentosConSaldo,
  obtenerResumenCartera,
  registrarPago,
  listarPagos,
  obtenerPago,
  anularPago,
  PagoError,
} from './pagos.service.js'

function manejarError(error, res, next) {
  if (error instanceof PagoError) {
    return res.status(error.status).json({ error: error.message })
  }
  next(error)
}

export async function getDocumentosConSaldo(req, res, next) {
  try {
    const { tipo, estadoCartera, tercero, fechaDesde, fechaHasta, page, pageSize } = req.query
    const resultado = await listarDocumentosConSaldo({
      empresaId: req.empresaId,
      tipo,
      estadoCartera,
      tercero,
      fechaDesde,
      fechaHasta,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    })
    res.json(resultado)
  } catch (error) {
    manejarError(error, res, next)
  }
}

export async function getResumen(req, res, next) {
  try {
    const { tipo, fechaDesde, fechaHasta } = req.query
    res.json(await obtenerResumenCartera({ empresaId: req.empresaId, tipo, fechaDesde, fechaHasta }))
  } catch (error) {
    manejarError(error, res, next)
  }
}

export async function postPago(req, res, next) {
  try {
    const { tipo, terceroId, fecha, valor, formaPagoId, cuentaBancariaId, observaciones, aplicaciones } = req.body || {}
    const pago = await registrarPago({
      empresaId: req.empresaId,
      usuarioId: req.usuario.id,
      tipo,
      terceroId,
      fecha,
      valor,
      formaPagoId,
      cuentaBancariaId,
      observaciones,
      aplicaciones,
    })
    res.status(201).json(pago)
  } catch (error) {
    manejarError(error, res, next)
  }
}

export async function getPagos(req, res, next) {
  try {
    const { tipo, terceroId, page, pageSize } = req.query
    const resultado = await listarPagos({
      empresaId: req.empresaId,
      tipo,
      terceroId,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    })
    res.json(resultado)
  } catch (error) {
    manejarError(error, res, next)
  }
}

export async function getPago(req, res, next) {
  try {
    res.json(await obtenerPago({ empresaId: req.empresaId, pagoId: req.params.id }))
  } catch (error) {
    manejarError(error, res, next)
  }
}

export async function postAnular(req, res, next) {
  try {
    res.json(await anularPago({ empresaId: req.empresaId, pagoId: req.params.id, usuarioId: req.usuario.id }))
  } catch (error) {
    manejarError(error, res, next)
  }
}
