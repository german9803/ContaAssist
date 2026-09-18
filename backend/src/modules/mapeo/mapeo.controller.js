import {
  listarMapeoCuentas,
  upsertMapeoCuenta,
  listarMapeoFormasPago,
  upsertMapeoFormaPago,
  listarMapeoTerceros,
  upsertMapeoTercero,
  MapeoError,
} from './mapeo.service.js'

function manejarError(error, res, next) {
  if (error instanceof MapeoError) {
    return res.status(error.status).json({ error: error.message })
  }
  next(error)
}

export async function getMapeoCuentas(req, res, next) {
  try {
    res.json(await listarMapeoCuentas({ empresaId: req.empresaId, sistemaDestinoCodigo: req.query.sistemaDestino }))
  } catch (error) {
    manejarError(error, res, next)
  }
}

export async function postMapeoCuenta(req, res, next) {
  try {
    const { sistemaDestino, cuentaContableId, codigoDestino } = req.body || {}
    res.status(201).json(
      await upsertMapeoCuenta({
        empresaId: req.empresaId,
        usuarioId: req.usuario.id,
        sistemaDestinoCodigo: sistemaDestino,
        cuentaContableId,
        codigoDestino,
      }),
    )
  } catch (error) {
    manejarError(error, res, next)
  }
}

export async function getMapeoFormasPago(req, res, next) {
  try {
    res.json(await listarMapeoFormasPago({ empresaId: req.empresaId, sistemaDestinoCodigo: req.query.sistemaDestino }))
  } catch (error) {
    manejarError(error, res, next)
  }
}

export async function postMapeoFormaPago(req, res, next) {
  try {
    const { sistemaDestino, formaPagoId, codigoDestino } = req.body || {}
    res.status(201).json(
      await upsertMapeoFormaPago({
        empresaId: req.empresaId,
        usuarioId: req.usuario.id,
        sistemaDestinoCodigo: sistemaDestino,
        formaPagoId,
        codigoDestino,
      }),
    )
  } catch (error) {
    manejarError(error, res, next)
  }
}

export async function getMapeoTerceros(req, res, next) {
  try {
    res.json(await listarMapeoTerceros({ empresaId: req.empresaId, sistemaDestinoCodigo: req.query.sistemaDestino }))
  } catch (error) {
    manejarError(error, res, next)
  }
}

export async function postMapeoTercero(req, res, next) {
  try {
    const { sistemaDestino, terceroId, codigoDestino } = req.body || {}
    res.status(201).json(
      await upsertMapeoTercero({
        empresaId: req.empresaId,
        usuarioId: req.usuario.id,
        sistemaDestinoCodigo: sistemaDestino,
        terceroId,
        codigoDestino,
      }),
    )
  } catch (error) {
    manejarError(error, res, next)
  }
}
