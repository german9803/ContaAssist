import {
  listarDocumentos,
  obtenerDocumento,
  actualizarDocumento,
  revalidarDocumento,
  aprobarDocumento,
  rechazarDocumento,
  obtenerArchivoOriginalDeDocumento,
  obtenerResumen,
  DocumentoError,
} from './documentos.service.js'

function manejarError(error, res, next) {
  if (error instanceof DocumentoError) {
    return res.status(error.status).json({ error: error.message })
  }
  next(error)
}

export async function getDocumentos(req, res, next) {
  try {
    const { estado, tipoDocumento, tercero, fechaDesde, fechaHasta, page, pageSize } = req.query
    const resultado = await listarDocumentos({
      empresaId: req.empresaId,
      estado,
      tipoDocumento,
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
    const { tipoDocumento, fechaDesde, fechaHasta } = req.query
    res.json(await obtenerResumen({ empresaId: req.empresaId, tipoDocumento, fechaDesde, fechaHasta }))
  } catch (error) {
    manejarError(error, res, next)
  }
}

export async function getDocumento(req, res, next) {
  try {
    res.json(await obtenerDocumento({ empresaId: req.empresaId, documentoId: req.params.id }))
  } catch (error) {
    manejarError(error, res, next)
  }
}

export async function patchDocumento(req, res, next) {
  try {
    const documento = await actualizarDocumento({
      empresaId: req.empresaId,
      documentoId: req.params.id,
      usuarioId: req.usuario.id,
      cambios: req.body || {},
    })
    res.json(documento)
  } catch (error) {
    manejarError(error, res, next)
  }
}

export async function postRevalidar(req, res, next) {
  try {
    res.json(await revalidarDocumento({ empresaId: req.empresaId, documentoId: req.params.id }))
  } catch (error) {
    manejarError(error, res, next)
  }
}

export async function postAprobar(req, res, next) {
  try {
    res.json(await aprobarDocumento({ empresaId: req.empresaId, documentoId: req.params.id, usuarioId: req.usuario.id }))
  } catch (error) {
    manejarError(error, res, next)
  }
}

export async function postRechazar(req, res, next) {
  try {
    const { motivo } = req.body || {}
    res.json(
      await rechazarDocumento({ empresaId: req.empresaId, documentoId: req.params.id, usuarioId: req.usuario.id, motivo }),
    )
  } catch (error) {
    manejarError(error, res, next)
  }
}

export async function getArchivoOriginal(req, res, next) {
  try {
    const { buffer, nombreOriginal, extension } = await obtenerArchivoOriginalDeDocumento({
      empresaId: req.empresaId,
      documentoId: req.params.id,
    })
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(nombreOriginal)}"`)
    res.type(extension)
    res.send(buffer)
  } catch (error) {
    manejarError(error, res, next)
  }
}
