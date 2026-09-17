import { TIPOS_DOCUMENTO } from './tiposDocumento.js'

// Plantilla propia de ContaAssist para carga masiva por CSV/Excel (no es el
// formato de ningún sistema externo — la definimos nosotros, así que sí
// podemos documentarla y validarla sin depender de terceros). Columnas
// aceptadas (encabezado, sin distinguir mayúsculas/acentos):
//   tipo_documento, numero_documento, prefijo, fecha_emision,
//   nit_tercero, razon_social_tercero, subtotal, iva, porcentaje_iva, total
export const COLUMNAS_PLANTILLA = [
  'tipo_documento',
  'numero_documento',
  'prefijo',
  'fecha_emision',
  'nit_tercero',
  'razon_social_tercero',
  'subtotal',
  'iva',
  'porcentaje_iva',
  'total',
]

const PORCENTAJE_A_CODIGO_IVA = { 19: 'IVA_19', 5: 'IVA_5', 0: 'IVA_0' }

function normalizarEncabezado(encabezado) {
  return String(encabezado || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita tildes
    .replace(/\s+/g, '_')
}

function aDecimal(valor) {
  if (valor === undefined || valor === null || valor === '') return null
  const num = Number(String(valor).replace(',', '.'))
  return Number.isFinite(num) ? num : null
}

function aFecha(valor) {
  if (!valor) return null
  const fecha = new Date(valor)
  return Number.isNaN(fecha.getTime()) ? null : fecha
}

// `filas`: array de objetos { encabezadoOriginal: valor } tal como los entrega
// el lector de CSV o de Excel. Devuelve un borrador de documento por fila,
// con sus propios errores (una fila mala no descarta las demás).
export function interpretarFilas(filas) {
  return filas.map((filaOriginal, indice) => {
    const fila = {}
    for (const [clave, valor] of Object.entries(filaOriginal)) {
      fila[normalizarEncabezado(clave)] = typeof valor === 'string' ? valor.trim() : valor
    }

    const errores = []
    const tipoDocumento = String(fila.tipo_documento || '').toUpperCase()
    if (!TIPOS_DOCUMENTO.includes(tipoDocumento)) {
      errores.push(`tipo_documento inválido: "${fila.tipo_documento || ''}"`)
    }
    if (!fila.numero_documento) errores.push('numero_documento es requerido')

    const fechaEmision = aFecha(fila.fecha_emision)
    if (!fechaEmision) errores.push('fecha_emision inválida o ausente (usar AAAA-MM-DD)')

    if (!fila.nit_tercero) errores.push('nit_tercero es requerido')
    if (!fila.razon_social_tercero) errores.push('razon_social_tercero es requerido')

    const subtotal = aDecimal(fila.subtotal)
    if (subtotal === null) errores.push('subtotal inválido o ausente')

    const total = aDecimal(fila.total)
    if (total === null) errores.push('total inválido o ausente')

    const iva = aDecimal(fila.iva) || 0
    const porcentajeIva = aDecimal(fila.porcentaje_iva) ?? (iva > 0 ? 19 : null)
    const codigoImpuestoIva = iva > 0 ? PORCENTAJE_A_CODIGO_IVA[porcentajeIva] : null
    if (iva > 0 && !codigoImpuestoIva) {
      errores.push(`porcentaje_iva no reconocido: ${porcentajeIva} (valores válidos: 19, 5, 0)`)
    }

    return {
      fila: indice + 2, // +2: fila 1 es el encabezado, y las filas son 1-indexadas para el usuario
      valido: errores.length === 0,
      errores,
      tipoDocumento,
      numeroDocumento: fila.numero_documento ? String(fila.numero_documento) : null,
      prefijo: fila.prefijo ? String(fila.prefijo) : null,
      fechaEmision,
      nit: fila.nit_tercero ? String(fila.nit_tercero) : null,
      razonSocialTercero: fila.razon_social_tercero ? String(fila.razon_social_tercero) : null,
      subtotal,
      total,
      iva,
      codigoImpuestoIva,
    }
  })
}
