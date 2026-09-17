import { prisma } from '../shared/prisma.js'
import { REGLAS } from './registry.js'

const INCLUYE_CONTEXTO = { tercero: true, impuestos: true }

// Ejecuta todas las reglas activas aplicables sobre un documento, guarda un
// registro append-only por regla (documento_validaciones nunca se actualiza
// ni se borra) y deja el documento en PENDIENTE_REVISION — no existe
// auto-aprobación en esta fase (ver docs/data-flow.md), así que todo
// documento pasa por revisión humana al menos una vez, tenga o no errores.
export async function ejecutarValidaciones(documentoId) {
  const documento = await prisma.documento.findUniqueOrThrow({
    where: { id: documentoId },
    include: INCLUYE_CONTEXTO,
  })

  const reglasActivas = await prisma.reglaValidacion.findMany({
    where: { activa: true, codigo: { in: REGLAS.map((r) => r.codigo) } },
  })
  const idPorCodigo = new Map(reglasActivas.map((r) => [r.codigo, r.id]))

  const resultados = []
  let hayBloqueante = false

  for (const regla of REGLAS) {
    const reglaId = idPorCodigo.get(regla.codigo)
    if (!reglaId) continue // regla desactivada o no sembrada
    if (!regla.aplicaA(documento)) continue

    const { resultado, mensaje } = await regla.evaluar(documento)
    resultados.push({ codigo: regla.codigo, severidad: regla.severidad, resultado, mensaje })

    if (resultado === 'FALLA' && regla.severidad === 'BLOQUEANTE') hayBloqueante = true

    await prisma.documentoValidacion.create({
      data: { documentoId, reglaId, resultado, mensaje: mensaje?.slice(0, 500) },
    })
  }

  await prisma.documento.update({ where: { id: documentoId }, data: { estado: 'PENDIENTE_REVISION' } })

  return { hayBloqueante, resultados }
}

// Solo lee el último resultado por regla, sin volver a evaluar — usado para
// decidir si aprobar es posible sin pagar el costo de re-ejecutar todo.
export async function obtenerUltimosResultados(documentoId) {
  const filas = await prisma.documentoValidacion.findMany({
    where: { documentoId },
    include: { regla: true },
    orderBy: { evaluadoEn: 'desc' },
  })

  const porRegla = new Map()
  for (const fila of filas) {
    if (!porRegla.has(fila.reglaId)) porRegla.set(fila.reglaId, fila)
  }

  return [...porRegla.values()].map((f) => ({
    codigo: f.regla.codigo,
    severidad: f.regla.severidad,
    resultado: f.resultado,
    mensaje: f.mensaje,
  }))
}
