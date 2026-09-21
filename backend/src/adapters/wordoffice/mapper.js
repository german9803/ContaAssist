// Columnas reales de la interfaz WordOffice, extraídas programáticamente
// (no transcritas a mano) de los archivos de ejemplo aportados por el usuario
// — ver README.md de este adaptador para la fuente y fecha exactas de cada uno.
// El texto de cada encabezado (incluyendo inconsistencias del propio
// WordOffice, como "Personalizado 1" con espacio en Encab pero
// "Personalizado1" sin espacio en Detalle, o "Detalle : Código Centro Costos"
// con un espacio extra antes de los dos puntos en el archivo de compras) se
// reproduce tal cual aparece en el archivo real, sin "corregirlo".

function personalizadosEncab() {
  return Array.from({ length: 15 }, (_, i) => ({ encabezado: `Encab: Personalizado ${i + 1}`, clave: 'vacio' }))
}
function personalizadosDetalle() {
  return Array.from({ length: 15 }, (_, i) => ({ encabezado: `Detalle: Personalizado${i + 1}`, clave: 'vacio' }))
}

export const COLUMNAS_COMPRAS = [
  { encabezado: 'Encab: Empresa', clave: 'empresa' },
  { encabezado: 'Encab: Tipo Documento', clave: 'tipoDocumento' },
  { encabezado: 'Encab: Prefijo', clave: 'prefijo' },
  { encabezado: 'Encab: Documento Número', clave: 'documentoNumero' },
  { encabezado: 'Encab: Fecha', clave: 'fecha' },
  { encabezado: 'Encab: Tercero Interno', clave: 'terceroInterno' },
  { encabezado: 'Encab: Tercero Externo', clave: 'terceroExterno' },
  { encabezado: 'Encab: Pref Dto Ext', clave: 'prefDtoExt' },
  { encabezado: 'Encab: No. Dto Ext', clave: 'noDtoExt' },
  { encabezado: 'Encab: Nota', clave: 'nota' },
  { encabezado: 'Encab: FormaPago', clave: 'formaPago' },
  { encabezado: 'Encab: Verificado', clave: 'vacio' },
  { encabezado: 'Encab: Anulado', clave: 'vacio' },
  { encabezado: 'Encab: Fecha Emision', clave: 'fechaEmision' },
  ...personalizadosEncab(),
  { encabezado: 'Encab: Importacion', clave: 'vacio' },
  { encabezado: 'Encab: Sucursal', clave: 'vacio' },
  { encabezado: 'Encab: Clasificación', clave: 'vacio' },
  { encabezado: 'Detalle: Producto', clave: 'producto' },
  { encabezado: 'Detalle: Bodega', clave: 'bodega' },
  { encabezado: 'Detalle: UnidadDeMedida', clave: 'unidadMedida' },
  { encabezado: 'Detalle: Cantidad', clave: 'cantidad' },
  { encabezado: 'Detalle: IVA', clave: 'iva' },
  { encabezado: 'Detalle: Valor Unitario', clave: 'valorUnitario' },
  { encabezado: 'Detalle: Descuento', clave: 'descuento' },
  { encabezado: 'Detalle: Vencimiento', clave: 'vencimiento' },
  { encabezado: 'Detalle: Nota', clave: 'notaLinea' },
  { encabezado: 'Detalle: Centro costos', clave: 'centroCostosTexto' },
  ...personalizadosDetalle(),
  { encabezado: 'Detalle : Código Centro Costos', clave: 'centroCostoCodigo' },
]

export const COLUMNAS_VENTAS = [
  { encabezado: 'Encab: Empresa', clave: 'empresa' },
  { encabezado: 'Encab: Tipo Documento', clave: 'tipoDocumento' },
  { encabezado: 'Encab: Prefijo', clave: 'prefijo' },
  { encabezado: 'Encab: Documento Número', clave: 'documentoNumero' },
  { encabezado: 'Encab: Fecha', clave: 'fecha' },
  { encabezado: 'Encab: Tercero Interno', clave: 'terceroInterno' },
  { encabezado: 'Encab: Tercero Externo', clave: 'terceroExterno' },
  { encabezado: 'Encab: Nota', clave: 'nota' },
  { encabezado: 'Encab: FormaPago', clave: 'formaPago' },
  { encabezado: 'Encab: Fecha Entrega', clave: 'fechaEntrega' },
  { encabezado: 'Encab: Prefijo Documento Externo', clave: 'prefDtoExt' },
  { encabezado: 'Encab: Número_Documento_Externo', clave: 'noDtoExt' },
  { encabezado: 'Encab: Verificado', clave: 'vacio' },
  { encabezado: 'Encab: Anulado', clave: 'vacio' },
  ...personalizadosEncab(),
  { encabezado: 'Encab: Sucursal', clave: 'vacio' },
  { encabezado: 'Encab: Clasificación', clave: 'vacio' },
  { encabezado: 'Detalle: Producto', clave: 'producto' },
  { encabezado: 'Detalle: Bodega', clave: 'bodega' },
  { encabezado: 'Detalle: UnidadDeMedida', clave: 'unidadMedida' },
  { encabezado: 'Detalle: Cantidad', clave: 'cantidad' },
  { encabezado: 'Detalle: IVA', clave: 'iva' },
  { encabezado: 'Detalle: Valor Unitario', clave: 'valorUnitario' },
  { encabezado: 'Detalle: Descuento', clave: 'descuento' },
  { encabezado: 'Detalle: Vencimiento', clave: 'vencimiento' },
  { encabezado: 'Detalle: Nota', clave: 'notaLinea' },
  { encabezado: 'Detalle: Centro costos', clave: 'centroCostosTexto' },
  ...personalizadosDetalle(),
  { encabezado: 'Detalle: Código Centro Costos', clave: 'centroCostoCodigo' },
]

const TIPO_WORDOFFICE = { FACTURA_COMPRA: 'FC', FACTURA_VENTA: 'FV' }

// Requisitos de exportación a WordOffice — distintos de los de Excel/CSV
// (formatoContaAssist.js): WordOffice resuelve la cuenta contable desde el
// producto, así que NO exige cuenta contable a nivel de cabecera, pero SÍ
// exige al menos una línea de detalle con producto+bodega asignados y
// mapeados a este destino.
export function validarPrerequisitosWordOffice(documentos, mapeos) {
  const errores = []

  for (const documento of documentos) {
    if (!documento.terceroId) {
      errores.push({ documentoId: documento.id, mensaje: 'El documento no tiene un tercero asignado' })
    } else if (!mapeos.terceros.has(documento.terceroId)) {
      errores.push({ documentoId: documento.id, mensaje: 'El tercero del documento no tiene mapeo a WORDOFFICE' })
    }

    if (!documento.formaPagoId) {
      errores.push({ documentoId: documento.id, mensaje: 'El documento no tiene forma de pago asignada' })
    } else if (!mapeos.formasPago.has(documento.formaPagoId)) {
      errores.push({ documentoId: documento.id, mensaje: 'La forma de pago del documento no tiene mapeo a WORDOFFICE' })
    }

    if (!documento.detalles || documento.detalles.length === 0) {
      errores.push({ documentoId: documento.id, mensaje: 'El documento no tiene líneas de producto (WordOffice las exige)' })
      continue
    }

    documento.detalles.forEach((linea, i) => {
      if (!linea.productoId) {
        errores.push({ documentoId: documento.id, mensaje: `Línea ${i + 1}: sin producto asignado` })
      } else if (!mapeos.productos.has(linea.productoId)) {
        errores.push({ documentoId: documento.id, mensaje: `Línea ${i + 1}: el producto no tiene mapeo a WORDOFFICE` })
      }

      if (!linea.bodegaId) {
        errores.push({ documentoId: documento.id, mensaje: `Línea ${i + 1}: sin bodega asignada` })
      } else if (!mapeos.bodegas.has(linea.bodegaId)) {
        errores.push({ documentoId: documento.id, mensaje: `Línea ${i + 1}: la bodega no tiene mapeo a WORDOFFICE` })
      }
    })
  }

  return errores
}

// Una fila RegistroDestino por DocumentoDetalle (no por documento) — así lo
// exige el formato real de WordOffice. `terceroInterno`/`notaLinea`/
// `centroCostosTexto` NO se resuelven aquí: son constantes por lote que el
// usuario aporta al generar la exportación (ver export-engine), no datos del
// documento — se inyectan después, en `generarArchivo`.
export function transformarWordOffice(documentos, mapeos) {
  const registros = []

  for (const documento of documentos) {
    const esCompra = documento.tipoDocumento === 'FACTURA_COMPRA'
    const tipoDocumentoWO = TIPO_WORDOFFICE[documento.tipoDocumento] ?? ''

    for (const linea of documento.detalles) {
      registros.push({
        tipoDocumentoInterno: documento.tipoDocumento,
        empresa: documento.empresa?.razonSocial ?? '',
        tipoDocumento: tipoDocumentoWO,
        // El "Documento Número" de compras es un consecutivo que WordOffice
        // controla internamente (confirmado con el usuario) — se deja vacío
        // y el número real del proveedor va en Pref Dto Ext/No. Dto Ext. En
        // ventas sí es el consecutivo propio de la venta.
        prefijo: esCompra ? tipoDocumentoWO : documento.prefijo ?? '',
        documentoNumero: esCompra ? '' : documento.numeroDocumento ?? '',
        fecha: documento.fechaEmision ?? null,
        terceroExterno: documento.tercero?.identificacion ?? '',
        prefDtoExt: esCompra ? documento.prefijo ?? '' : '',
        noDtoExt: esCompra ? documento.numeroDocumento ?? '' : '',
        nota: documento.observaciones ?? '',
        formaPago: mapeos.formasPago.get(documento.formaPagoId) ?? '',
        fechaEmision: documento.fechaEmision ?? null,
        fechaEntrega: documento.fechaEmision ?? null,
        producto: mapeos.productos.get(linea.productoId) ?? '',
        bodega: mapeos.bodegas.get(linea.bodegaId) ?? '',
        unidadMedida: linea.producto?.unidadMedida ?? '',
        cantidad: Number(linea.cantidad),
        iva: linea.porcentajeIva !== null && linea.porcentajeIva !== undefined ? Number(linea.porcentajeIva) : 0,
        valorUnitario: Number(linea.valorUnitario),
        descuento: linea.descuento !== null && linea.descuento !== undefined ? Number(linea.descuento) : 0,
        // Sin vencimiento propio, una venta se asume de contado (vence el
        // mismo día) — igual que en el archivo real de ventas; una compra sin
        // vencimiento explícito queda vacía en vez de inventar un plazo.
        vencimiento: documento.fechaVencimiento ?? (esCompra ? null : documento.fechaEmision ?? null),
        centroCostoCodigo: linea.centroCosto?.codigo ?? '',
      })
    }
  }

  return registros
}
