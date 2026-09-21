import { listarProductos, crearProducto, listarBodegas, crearBodega, InventarioError } from './inventario.service.js'

function manejarError(error, res, next) {
  if (error instanceof InventarioError) {
    return res.status(error.status).json({ error: error.message })
  }
  next(error)
}

export async function getProductos(req, res, next) {
  try {
    res.json(await listarProductos({ empresaId: req.empresaId, q: req.query.q }))
  } catch (error) {
    manejarError(error, res, next)
  }
}

export async function postProducto(req, res, next) {
  try {
    const producto = await crearProducto({ empresaId: req.empresaId, usuarioId: req.usuario.id, datos: req.body || {} })
    res.status(201).json(producto)
  } catch (error) {
    manejarError(error, res, next)
  }
}

export async function getBodegas(req, res, next) {
  try {
    res.json(await listarBodegas({ empresaId: req.empresaId }))
  } catch (error) {
    manejarError(error, res, next)
  }
}

export async function postBodega(req, res, next) {
  try {
    const bodega = await crearBodega({ empresaId: req.empresaId, usuarioId: req.usuario.id, datos: req.body || {} })
    res.status(201).json(bodega)
  } catch (error) {
    manejarError(error, res, next)
  }
}
