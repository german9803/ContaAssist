// Formato propio de ContaAssist (docs/transformation-engine.md: "Excel" y "CSV"
// son adaptadores de un formato libre, definido por nosotros, no de un tercero
// — a diferencia de WordOffice/Siigo, que exigen la plantilla oficial del
// proveedor). Ambos adaptadores comparten exactamente las mismas columnas y
// las mismas reglas de prerequisito; solo difieren en cómo serializan
// `generarArchivo`, así que esa parte se implementa una sola vez aquí.

export const COLUMNAS = [
  { clave: 'tipoDocumento', encabezado: 'Tipo de documento' },
  { clave: 'prefijo', encabezado: 'Prefijo' },
  { clave: 'numeroDocumento', encabezado: 'Número' },
  { clave: 'fechaEmision', encabezado: 'Fecha de emisión' },
  { clave: 'terceroIdentificacion', encabezado: 'Identificación tercero' },
  { clave: 'terceroNombre', encabezado: 'Tercero' },
  { clave: 'terceroCodigoDestino', encabezado: 'Código tercero destino' },
  { clave: 'cuentaCodigo', encabezado: 'Cuenta contable' },
  { clave: 'cuentaCodigoDestino', encabezado: 'Código cuenta destino' },
  { clave: 'centroCostoCodigo', encabezado: 'Centro de costo' },
  { clave: 'formaPagoCodigoDestino', encabezado: 'Código forma de pago destino' },
  { clave: 'subtotal', encabezado: 'Subtotal' },
  { clave: 'iva', encabezado: 'IVA' },
  { clave: 'total', encabezado: 'Total' },
]

// Refleja la regla de Fase 11 (docs/data-flow.md): un documento solo llega a
// LISTO_PARA_EXPORTAR si tiene tercero, cuenta contable y forma de pago
// asignados Y mapeados a este sistema destino. Centro de costo no está en esa
// lista (es advertencia, no bloqueante), así que no se exige aquí.
export function validarPrerequisitosContaAssist(documentos, mapeos) {
  const errores = []

  for (const documento of documentos) {
    if (!documento.terceroId) {
      errores.push({ documentoId: documento.id, mensaje: 'El documento no tiene un tercero asignado' })
    } else if (!mapeos.terceros.has(documento.terceroId)) {
      errores.push({ documentoId: documento.id, mensaje: 'El tercero del documento no tiene mapeo a este sistema destino' })
    }

    if (!documento.cuentaContableId) {
      errores.push({ documentoId: documento.id, mensaje: 'El documento no tiene cuenta contable asignada' })
    } else if (!mapeos.cuentas.has(documento.cuentaContableId)) {
      errores.push({ documentoId: documento.id, mensaje: 'La cuenta contable del documento no tiene mapeo a este sistema destino' })
    }

    if (!documento.formaPagoId) {
      errores.push({ documentoId: documento.id, mensaje: 'El documento no tiene forma de pago asignada' })
    } else if (!mapeos.formasPago.has(documento.formaPagoId)) {
      errores.push({ documentoId: documento.id, mensaje: 'La forma de pago del documento no tiene mapeo a este sistema destino' })
    }
  }

  return errores
}

function numeroOVacio(valor) {
  return valor !== null && valor !== undefined ? Number(valor) : ''
}

export function transformarContaAssist(documentos, mapeos) {
  return documentos.map((documento) => ({
    tipoDocumento: documento.tipoDocumento,
    prefijo: documento.prefijo ?? '',
    numeroDocumento: documento.numeroDocumento ?? '',
    fechaEmision: documento.fechaEmision ? documento.fechaEmision.toISOString().slice(0, 10) : '',
    terceroIdentificacion: documento.tercero?.identificacion ?? '',
    terceroNombre: documento.tercero?.razonSocial ?? '',
    terceroCodigoDestino: mapeos.terceros.get(documento.terceroId) ?? '',
    cuentaCodigo: documento.cuentaContable?.codigo ?? '',
    cuentaCodigoDestino: mapeos.cuentas.get(documento.cuentaContableId) ?? '',
    centroCostoCodigo: documento.centroCosto?.codigo ?? '',
    formaPagoCodigoDestino: mapeos.formasPago.get(documento.formaPagoId) ?? '',
    subtotal: numeroOVacio(documento.subtotal),
    iva: numeroOVacio(documento.totalImpuestos),
    total: numeroOVacio(documento.total),
  }))
}
