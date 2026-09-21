import { TIPOS_DOCUMENTO } from './tiposDocumento.js'

// Plantilla propia de ContaAssist para carga masiva por CSV/Excel (no es el
// formato de ningún sistema externo — la definimos nosotros, así que sí
// podemos documentarla y validarla sin depender de terceros). Columnas de
// cabecera (encabezado, sin distinguir mayúsculas/acentos):
//   tipo_documento, numero_documento, prefijo, fecha_emision,
//   nit_tercero, razon_social_tercero, subtotal, iva, porcentaje_iva, total
// Columnas de línea (Fase 14, todas opcionales — su ausencia no cambia nada
// del comportamiento anterior): producto_codigo, producto_descripcion,
// cantidad, valor_unitario, porcentaje_iva_linea, descuento, bodega_codigo.
// Varias filas con el mismo tipo_documento+numero_documento+nit_tercero se
// agrupan en UN documento con varias líneas (igual que la cabecera se repite
// en cada fila de las interfaces reales de WordOffice).
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

export const COLUMNAS_LINEA_OPCIONALES = [
  'producto_codigo',
  'producto_descripcion',
  'cantidad',
  'valor_unitario',
  'porcentaje_iva_linea',
  'descuento',
  'bodega_codigo',
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

function aTexto(valor) {
  return valor !== undefined && valor !== null && valor !== '' ? String(valor) : null
}

// Una fila = un borrador de cabecera + (si trae columnas de línea) una línea.
function interpretarFila(filaOriginal, indice) {
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

  const descripcionLinea = aTexto(fila.producto_descripcion)
  const trayLinea = descripcionLinea !== null || fila.cantidad !== undefined || fila.valor_unitario !== undefined
  let linea = null
  if (trayLinea) {
    const cantidad = aDecimal(fila.cantidad) ?? 1
    const valorUnitario = aDecimal(fila.valor_unitario)
    if (valorUnitario === null) errores.push('valor_unitario inválido o ausente para la línea de producto')
    linea = {
      codigoProducto: aTexto(fila.producto_codigo),
      descripcion: descripcionLinea || 'Ítem sin descripción',
      cantidad,
      valorUnitario: valorUnitario ?? 0,
      subtotalLinea: valorUnitario !== null ? cantidad * valorUnitario : 0,
      porcentajeIva: aDecimal(fila.porcentaje_iva_linea),
      descuento: aDecimal(fila.descuento),
      codigoBodega: aTexto(fila.bodega_codigo),
    }
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
    linea,
  }
}

// `filas`: array de objetos { encabezadoOriginal: valor } tal como los entrega
// el lector de CSV o de Excel. Agrupa filas con la misma clave de documento
// (tipo+número+nit) en un solo borrador con varias `lineas`; una fila sin esa
// clave completa nunca se agrupa con otra (evita mezclar filas inválidas).
export function interpretarFilas(filas) {
  const grupos = new Map()
  const orden = []

  filas.forEach((filaOriginal, indice) => {
    const { linea, ...borrador } = interpretarFila(filaOriginal, indice)
    const clave =
      borrador.tipoDocumento && borrador.numeroDocumento && borrador.nit
        ? `${borrador.tipoDocumento}|${borrador.numeroDocumento}|${borrador.nit}`
        : `__fila_${indice}`

    if (!grupos.has(clave)) {
      grupos.set(clave, { ...borrador, lineas: linea ? [linea] : [] })
      orden.push(clave)
      return
    }

    const grupo = grupos.get(clave)
    grupo.valido = grupo.valido && borrador.valido
    grupo.errores.push(...borrador.errores.map((e) => `fila ${borrador.fila}: ${e}`))
    if (linea) grupo.lineas.push(linea)
  })

  return orden.map((clave) => grupos.get(clave))
}
