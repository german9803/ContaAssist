import {
  listarCuentasBancarias,
  crearCuentaBancaria,
  importarExtracto,
  listarExtractos,
  obtenerExtracto,
  conciliarLinea,
  desconciliarLinea,
  BancoError,
} from './bancos.service.js'

function manejarError(error, res, next) {
  if (error instanceof BancoError) {
    return res.status(error.status).json({ error: error.message })
  }
  next(error)
}

export async function getCuentas(req, res, next) {
  try {
    res.json(await listarCuentasBancarias({ empresaId: req.empresaId }))
  } catch (error) {
    manejarError(error, res, next)
  }
}

export async function postCuenta(req, res, next) {
  try {
    const cuenta = await crearCuentaBancaria({ empresaId: req.empresaId, usuarioId: req.usuario.id, datos: req.body || {} })
    res.status(201).json(cuenta)
  } catch (error) {
    manejarError(error, res, next)
  }
}

export async function postExtracto(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: 'archivo es requerido' })
    const resultado = await importarExtracto({
      empresaId: req.empresaId,
      usuarioId: req.usuario.id,
      cuentaBancariaId: req.params.id,
      nombreArchivo: req.file.originalname,
      buffer: req.file.buffer,
    })
    res.status(201).json(resultado)
  } catch (error) {
    manejarError(error, res, next)
  }
}

export async function getExtractos(req, res, next) {
  try {
    res.json(await listarExtractos({ empresaId: req.empresaId, cuentaBancariaId: req.params.id }))
  } catch (error) {
    manejarError(error, res, next)
  }
}

export async function getExtracto(req, res, next) {
  try {
    res.json(await obtenerExtracto({ empresaId: req.empresaId, extractoId: req.params.extractoId }))
  } catch (error) {
    manejarError(error, res, next)
  }
}

export async function postConciliar(req, res, next) {
  try {
    const { pagoId } = req.body || {}
    res.json(
      await conciliarLinea({ empresaId: req.empresaId, usuarioId: req.usuario.id, lineaId: req.params.lineaId, pagoId }),
    )
  } catch (error) {
    manejarError(error, res, next)
  }
}

export async function postDesconciliar(req, res, next) {
  try {
    res.json(await desconciliarLinea({ empresaId: req.empresaId, usuarioId: req.usuario.id, lineaId: req.params.lineaId }))
  } catch (error) {
    manejarError(error, res, next)
  }
}
