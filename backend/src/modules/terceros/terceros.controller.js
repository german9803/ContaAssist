import { listarTerceros, obtenerTercero, crearTercero, actualizarTercero, TerceroError } from './terceros.service.js'

function manejarError(error, res, next) {
  if (error instanceof TerceroError) {
    return res.status(error.status).json({ error: error.message })
  }
  next(error)
}

export async function getTerceros(req, res, next) {
  try {
    const { tipo, q, page, pageSize } = req.query
    const resultado = await listarTerceros({
      empresaId: req.empresaId,
      tipo,
      q,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    })
    res.json(resultado)
  } catch (error) {
    manejarError(error, res, next)
  }
}

export async function getTercero(req, res, next) {
  try {
    res.json(await obtenerTercero({ empresaId: req.empresaId, terceroId: req.params.id }))
  } catch (error) {
    manejarError(error, res, next)
  }
}

export async function postTercero(req, res, next) {
  try {
    const tercero = await crearTercero({ empresaId: req.empresaId, usuarioId: req.usuario.id, datos: req.body || {} })
    res.status(201).json(tercero)
  } catch (error) {
    manejarError(error, res, next)
  }
}

export async function patchTercero(req, res, next) {
  try {
    const tercero = await actualizarTercero({
      empresaId: req.empresaId,
      terceroId: req.params.id,
      usuarioId: req.usuario.id,
      cambios: req.body || {},
    })
    res.json(tercero)
  } catch (error) {
    manejarError(error, res, next)
  }
}
