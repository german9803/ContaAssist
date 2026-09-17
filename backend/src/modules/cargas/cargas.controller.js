import {
  crearCarga,
  listarCargas,
  obtenerCarga,
  listarArchivosDeCarga,
  obtenerArchivoParaDescarga,
  CargaError,
} from './cargas.service.js'

function manejarError(error, res, next) {
  if (error instanceof CargaError) {
    return res.status(error.status).json({ error: error.message })
  }
  next(error)
}

export async function postCarga(req, res, next) {
  try {
    const { tipoOrigen } = req.body || {}
    const carga = await crearCarga({
      empresaId: req.empresaId,
      usuarioId: req.usuario.id,
      tipoOrigen,
      archivos: req.files || [],
    })
    res.status(201).json(carga)
  } catch (error) {
    manejarError(error, res, next)
  }
}

export async function getCargas(req, res, next) {
  try {
    const { estado, page, pageSize } = req.query
    const resultado = await listarCargas({
      empresaId: req.empresaId,
      estado,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    })
    res.json(resultado)
  } catch (error) {
    manejarError(error, res, next)
  }
}

export async function getCarga(req, res, next) {
  try {
    res.json(await obtenerCarga({ empresaId: req.empresaId, cargaId: req.params.id }))
  } catch (error) {
    manejarError(error, res, next)
  }
}

export async function getArchivosDeCarga(req, res, next) {
  try {
    res.json(await listarArchivosDeCarga({ empresaId: req.empresaId, cargaId: req.params.id }))
  } catch (error) {
    manejarError(error, res, next)
  }
}

export async function getDescargaArchivo(req, res, next) {
  try {
    const { buffer, nombreOriginal, extension } = await obtenerArchivoParaDescarga({
      empresaId: req.empresaId,
      cargaId: req.params.id,
      archivoId: req.params.archivoId,
    })
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(nombreOriginal)}"`)
    res.type(extension)
    res.send(buffer)
  } catch (error) {
    manejarError(error, res, next)
  }
}
