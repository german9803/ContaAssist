import { prisma } from '../../shared/prisma.js'

export default {
  codigo: 'DUPLICADO_DOCUMENTO',
  severidad: 'BLOQUEANTE',
  aplicaA: (documento) => Boolean(documento.terceroId && documento.numeroDocumento),
  async evaluar(documento) {
    const otro = await prisma.documento.findFirst({
      where: {
        empresaId: documento.empresaId,
        terceroId: documento.terceroId,
        numeroDocumento: documento.numeroDocumento,
        tipoDocumento: documento.tipoDocumento,
        id: { not: documento.id },
        estado: { notIn: ['RECHAZADO', 'DUPLICADO'] },
      },
      select: { id: true },
    })

    if (otro) {
      return {
        resultado: 'FALLA',
        mensaje: `Ya existe otro documento (${otro.id}) con el mismo tercero, número y tipo`,
      }
    }
    return { resultado: 'OK' }
  },
}
