import {
  listarMapeoCuentas,
  upsertMapeoCuenta,
  listarMapeoFormasPago,
  upsertMapeoFormaPago,
  listarMapeoTerceros,
  upsertMapeoTercero,
  listarMapeoBodegas,
  upsertMapeoBodega,
  listarMapeoProductos,
  upsertMapeoProducto,
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

export async function getMapeoBodegas(req, res, next) {
  try {
    res.json(await listarMapeoBodegas({ empresaId: req.empresaId, sistemaDestinoCodigo: req.query.sistemaDestino }))
  } catch (error) {
    manejarError(error, res, next)
  }
}

export async function postMapeoBodega(req, res, next) {
  try {
    const { sistemaDestino, bodegaId, codigoDestino } = req.body || {}
    res.status(201).json(
      await upsertMapeoBodega({
        empresaId: req.empresaId,
        usuarioId: req.usuario.id,
        sistemaDestinoCodigo: sistemaDestino,
        bodegaId,
        codigoDestino,
      }),
    )
  } catch (error) {
    manejarError(error, res, next)
  }
}

export async function getMapeoProductos(req, res, next) {
  try {
    res.json(await listarMapeoProductos({ empresaId: req.empresaId, sistemaDestinoCodigo: req.query.sistemaDestino }))
  } catch (error) {
    manejarError(error, res, next)
  }
}

export async function postMapeoProducto(req, res, next) {
  try {
    const { sistemaDestino, productoId, codigoDestino } = req.body || {}
    res.status(201).json(
      await upsertMapeoProducto({
        empresaId: req.empresaId,
        usuarioId: req.usuario.id,
        sistemaDestinoCodigo: sistemaDestino,
        productoId,
        codigoDestino,
      }),
    )
  } catch (error) {
    manejarError(error, res, next)
  }
}
