import {
  listarDocumentos,
  obtenerDocumento,
  actualizarDocumento,
  obtenerArchivoOriginalDeDocumento,
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
    const { estado, tipoDocumento, page, pageSize } = req.query
    const resultado = await listarDocumentos({
      empresaId: req.empresaId,
      estado,
      tipoDocumento,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    })
    res.json(resultado)
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
