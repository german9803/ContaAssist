import {
  previsualizar,
  crearExportacion,
  listarExportaciones,
  obtenerExportacion,
  obtenerArchivoParaDescarga,
  ExportacionError,
} from './exportaciones.service.js'

function manejarError(error, res, next) {
  if (error instanceof ExportacionError) {
    return res.status(error.status).json({ error: error.message })
  }
  next(error)
}

function datosSolicitud(req) {
  const { sistemaDestino, tipoInformacion, periodoInicio, periodoFin, parametrosAdaptador } = req.body || {}
  return {
    empresaId: req.empresaId,
    usuarioId: req.usuario.id,
    sistemaDestino,
    tipoInformacion,
    periodoInicio,
    periodoFin,
    parametrosAdaptador,
  }
}

export async function postPreview(req, res, next) {
  try {
    res.json(await previsualizar(datosSolicitud(req)))
  } catch (error) {
    manejarError(error, res, next)
  }
}

export async function postExportacion(req, res, next) {
  try {
    res.status(201).json(await crearExportacion(datosSolicitud(req)))
  } catch (error) {
    manejarError(error, res, next)
  }
}

export async function getExportaciones(req, res, next) {
  try {
    const { page, pageSize } = req.query
    const resultado = await listarExportaciones({
      empresaId: req.empresaId,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    })
    res.json(resultado)
  } catch (error) {
    manejarError(error, res, next)
  }
}

export async function getExportacion(req, res, next) {
  try {
    res.json(await obtenerExportacion({ empresaId: req.empresaId, exportacionId: req.params.id }))
  } catch (error) {
    manejarError(error, res, next)
  }
}

export async function getDescarga(req, res, next) {
  try {
    const { buffer, nombreArchivo, extension } = await obtenerArchivoParaDescarga({
      empresaId: req.empresaId,
      exportacionId: req.params.id,
    })
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(nombreArchivo)}"`)
    res.type(extension)
    res.send(buffer)
  } catch (error) {
    manejarError(error, res, next)
  }
}
