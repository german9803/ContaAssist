import { prisma } from '../shared/prisma.js'

// Resolución mínima de terceros para el motor de procesamiento. NO es el
// módulo de Terceros (Fase 10, con su propia API/UI/clasificación) — solo
// busca por NIT dentro de la empresa y crea uno básico si no existe, para
// que `documentos.tercero_id` pueda resolverse durante la extracción.
export async function buscarOCrearTercero({ empresaId, nit, razonSocial }) {
  const existente = await prisma.tercero.findUnique({
    where: { empresaId_tipoIdentificacion_identificacion: { empresaId, tipoIdentificacion: 'NIT', identificacion: nit } },
  })
  if (existente) return existente

  return prisma.tercero.create({
    data: {
      empresaId,
      tipoIdentificacion: 'NIT',
      identificacion: nit,
      razonSocial,
      tipoTercero: 'PROVEEDOR',
    },
  })
}
