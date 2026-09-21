import { prisma } from '../shared/prisma.js'

// Resolución mínima de productos para el motor de procesamiento. NO es el
// catálogo de Inventario (Fase 14, con su propia API/UI) — solo resuelve una
// línea de detalle extraída de un documento a un `producto_id`, para que
// `documento_detalles.producto_id` pueda completarse durante la extracción.
// Clave natural: `codigo` si la línea lo trae (ej. SellersItemIdentification
// del XML); si no, `descripcion` exacta dentro de la empresa — evita crear un
// producto nuevo por cada factura cuando el proveedor repite el mismo ítem.
export async function buscarOCrearProducto({ empresaId, codigo, descripcion }) {
  if (codigo) {
    const existente = await prisma.producto.findUnique({ where: { empresaId_codigo: { empresaId, codigo } } })
    if (existente) return existente
    return prisma.producto.create({ data: { empresaId, codigo, nombre: descripcion } })
  }

  const existente = await prisma.producto.findFirst({ where: { empresaId, codigo: null, nombre: descripcion } })
  if (existente) return existente
  return prisma.producto.create({ data: { empresaId, nombre: descripcion } })
}
