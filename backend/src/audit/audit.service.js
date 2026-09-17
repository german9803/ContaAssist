import { prisma } from '../shared/prisma.js'

// Registro de acciones importantes (sección 23). Append-only: nunca se
// actualiza ni se elimina una fila de auditoría.
export async function registrarAuditoria({
  empresaId,
  usuarioId,
  accion,
  entidad,
  entidadId,
  campo,
  valorAnterior,
  valorNuevo,
}) {
  await prisma.auditoria.create({
    data: { empresaId, usuarioId, accion, entidad, entidadId, campo, valorAnterior, valorNuevo },
  })
}

export async function listarAuditoria({ empresaId, page = 1, pageSize = 50 }) {
  const where = { empresaId }
  const [total, registros] = await Promise.all([
    prisma.auditoria.count({ where }),
    prisma.auditoria.findMany({
      where,
      orderBy: { creadoEn: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { usuario: { select: { nombreCompleto: true, email: true } } },
    }),
  ])

  return {
    data: registros.map((r) => ({
      id: r.id,
      accion: r.accion,
      entidad: r.entidad,
      entidadId: r.entidadId,
      campo: r.campo,
      valorAnterior: r.valorAnterior,
      valorNuevo: r.valorNuevo,
      creadoEn: r.creadoEn,
      usuario: r.usuario,
    })),
    total,
    page,
    pageSize,
  }
}
