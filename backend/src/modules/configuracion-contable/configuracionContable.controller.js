import {
  listarCuentasContables,
  crearCuentaContable,
  listarCentrosCosto,
  crearCentroCosto,
  listarFormasPago,
  crearFormaPago,
  listarSistemasDestino,
  ConfigError,
} from './configuracionContable.service.js'

function manejarError(error, res, next) {
  if (error instanceof ConfigError) {
    return res.status(error.status).json({ error: error.message })
  }
  next(error)
}

export async function getCuentasContables(req, res, next) {
  try {
    res.json(await listarCuentasContables({ empresaId: req.empresaId }))
  } catch (error) {
    manejarError(error, res, next)
  }
}

export async function postCuentaContable(req, res, next) {
  try {
    const cuenta = await crearCuentaContable({ empresaId: req.empresaId, usuarioId: req.usuario.id, datos: req.body || {} })
    res.status(201).json(cuenta)
  } catch (error) {
    manejarError(error, res, next)
  }
}

export async function getCentrosCosto(req, res, next) {
  try {
    res.json(await listarCentrosCosto({ empresaId: req.empresaId }))
  } catch (error) {
    manejarError(error, res, next)
  }
}

export async function postCentroCosto(req, res, next) {
  try {
    const centro = await crearCentroCosto({ empresaId: req.empresaId, usuarioId: req.usuario.id, datos: req.body || {} })
    res.status(201).json(centro)
  } catch (error) {
    manejarError(error, res, next)
  }
}

export async function getFormasPago(req, res, next) {
  try {
    res.json(await listarFormasPago({ empresaId: req.empresaId }))
  } catch (error) {
    manejarError(error, res, next)
  }
}

export async function postFormaPago(req, res, next) {
  try {
    const forma = await crearFormaPago({ empresaId: req.empresaId, usuarioId: req.usuario.id, datos: req.body || {} })
    res.status(201).json(forma)
  } catch (error) {
    manejarError(error, res, next)
  }
}

export async function getSistemasDestino(req, res, next) {
  try {
    res.json(await listarSistemasDestino())
  } catch (error) {
    manejarError(error, res, next)
  }
}
