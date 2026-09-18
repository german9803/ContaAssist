import { prisma } from '../shared/prisma.js'

// Resolución mínima de terceros para el motor de procesamiento. NO es el
// módulo de Terceros (Fase 10, con su propia API/UI/clasificación) — solo
// busca por NIT dentro de la empresa y crea uno básico si no existe, para
// que `documentos.tercero_id` pueda resolverse durante la extracción.
export async function buscarOCrearTercero({ empresaId, nit, razonSocial, tipoTercero = 'PROVEEDOR' }) {
  const existente = await prisma.tercero.findUnique({
    where: { empresaId_tipoIdentificacion_identificacion: { empresaId, tipoIdentificacion: 'NIT', identificacion: nit } },
  })

  if (existente) {
    // El mismo NIT aparece como proveedor en una compra y como cliente en una
    // venta (o viceversa) — es un caso real (empresas que se compran y se
    // venden entre sí), así que se reclasifica a AMBOS en vez de perder la
    // clasificación original o forzar la nueva sobre la existente.
    const debeAmpliarse =
      existente.tipoTercero !== 'AMBOS' && existente.tipoTercero !== tipoTercero
    if (debeAmpliarse) {
      return prisma.tercero.update({ where: { id: existente.id }, data: { tipoTercero: 'AMBOS' } })
    }
    return existente
  }

  return prisma.tercero.create({
    data: { empresaId, tipoIdentificacion: 'NIT', identificacion: nit, razonSocial, tipoTercero },
  })
}
