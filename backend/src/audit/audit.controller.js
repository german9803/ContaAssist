import { listarAuditoria } from './audit.service.js'

export async function getAuditoria(req, res, next) {
  try {
    const { page, pageSize } = req.query
    const resultado = await listarAuditoria({
      empresaId: req.empresaId,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    })
    res.json(resultado)
  } catch (error) {
    next(error)
  }
}
