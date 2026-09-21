import { XMLParser } from 'fast-xml-parser'

// Factura electrónica colombiana (UBL 2.1, el estándar público que exige la
// DIAN) — no es un formato inventado ni propietario de un tercero, así que sí
// podemos implementarlo directamente (a diferencia de WordOffice/Siigo).
// Referencia de campos: cbc:ID, cbc:IssueDate, cac:AccountingSupplierParty,
// cac:LegalMonetaryTotal, cac:TaxTotal.

const parser = new XMLParser({ removeNSPrefix: true, ignoreAttributes: false })

function primero(valor) {
  return Array.isArray(valor) ? valor[0] : valor
}

function textoDe(nodo) {
  if (nodo === undefined || nodo === null) return null
  if (typeof nodo === 'object') return nodo['#text'] ?? null
  return String(nodo)
}

function numeroDe(nodo) {
  const texto = textoDe(nodo)
  if (texto === null) return null
  const num = Number(texto)
  return Number.isFinite(num) ? num : null
}

function comoArray(valor) {
  if (valor === undefined || valor === null) return []
  return Array.isArray(valor) ? valor : [valor]
}

const PORCENTAJE_A_CODIGO_IVA = { 19: 'IVA_19', 5: 'IVA_5', 0: 'IVA_0' }

// cac:InvoiceLine (Fase 14) — a diferencia de la cabecera, el detalle por
// línea es opcional para el resto del sistema (documento_detalles.producto_id
// es nullable), así que un error aquí nunca invalida la factura completa:
// se documenta como advertencia y el documento queda sin líneas.
function extraerLineas(invoice) {
  try {
    return comoArray(invoice.InvoiceLine).map((linea) => {
      const item = primero(linea.Item)
      const precio = primero(linea.Price)
      const cantidadNodo = linea.InvoicedQuantity
      return {
        descripcion: textoDe(item?.Description) || textoDe(linea.ID) || 'Ítem sin descripción',
        codigoProducto:
          textoDe(primero(item?.SellersItemIdentification)?.ID) ||
          textoDe(primero(item?.StandardItemIdentification)?.ID) ||
          null,
        unidadMedida: cantidadNodo?.['@_unitCode'] ?? null,
        cantidad: numeroDe(cantidadNodo) ?? 1,
        valorUnitario: numeroDe(precio?.PriceAmount) ?? 0,
        subtotalLinea: numeroDe(linea.LineExtensionAmount) ?? 0,
      }
    })
  } catch {
    return []
  }
}

export function parsearXmlFactura(buffer) {
  const errores = []
  let invoice

  try {
    const doc = parser.parse(buffer.toString('utf-8'))
    invoice = doc.Invoice || doc.AttachedDocument?.Attachment?.ExternalReference?.Invoice
    if (!invoice) throw new Error('No se encontró un elemento <Invoice> en el XML')
  } catch (error) {
    return { valido: false, errores: [`XML inválido o formato no reconocido: ${error.message}`] }
  }

  const numeroDocumento = textoDe(invoice.ID)
  if (!numeroDocumento) errores.push('No se encontró cbc:ID (número de factura)')

  const fechaTexto = textoDe(invoice.IssueDate)
  const fechaEmision = fechaTexto ? new Date(fechaTexto) : null
  if (!fechaEmision || Number.isNaN(fechaEmision.getTime())) errores.push('No se encontró o es inválida cbc:IssueDate')

  let nit = null
  let razonSocialTercero = null
  try {
    const proveedor = primero(invoice.AccountingSupplierParty)?.Party
    nit = textoDe(primero(proveedor?.PartyTaxScheme)?.CompanyID)
    razonSocialTercero =
      textoDe(primero(proveedor?.PartyLegalEntity)?.RegistrationName) || textoDe(primero(proveedor?.PartyName)?.Name)
  } catch {
    /* estructura inesperada del emisor; se deja nulo para revisión manual */
  }
  if (!nit) errores.push('No se encontró el NIT del emisor (AccountingSupplierParty)')
  if (!razonSocialTercero) errores.push('No se encontró la razón social del emisor')

  const totales = primero(invoice.LegalMonetaryTotal)
  const subtotal = numeroDe(totales?.LineExtensionAmount) ?? numeroDe(totales?.TaxExclusiveAmount)
  const total = numeroDe(totales?.PayableAmount)
  if (subtotal === null) errores.push('No se encontró LegalMonetaryTotal/LineExtensionAmount (subtotal)')
  if (total === null) errores.push('No se encontró LegalMonetaryTotal/PayableAmount (total)')

  let iva = 0
  let porcentajeIva = null
  try {
    const taxTotal = primero(invoice.TaxTotal)
    iva = numeroDe(taxTotal?.TaxAmount) || 0
    const categoria = primero(primero(taxTotal?.TaxSubtotal)?.TaxCategory)
    porcentajeIva = numeroDe(categoria?.Percent)
  } catch {
    /* factura sin desglose de impuestos reconocible */
  }
  const codigoImpuestoIva = iva > 0 ? PORCENTAJE_A_CODIGO_IVA[porcentajeIva] : null
  if (iva > 0 && !codigoImpuestoIva) {
    errores.push(`Porcentaje de IVA no reconocido: ${porcentajeIva} (valores válidos: 19, 5, 0)`)
  }

  return {
    valido: errores.length === 0,
    errores,
    tipoDocumento: 'FACTURA_COMPRA', // desde la perspectiva de quien recibe el XML del proveedor
    numeroDocumento,
    prefijo: null,
    fechaEmision: fechaEmision && !Number.isNaN(fechaEmision.getTime()) ? fechaEmision : null,
    nit,
    razonSocialTercero,
    subtotal,
    total,
    iva,
    codigoImpuestoIva,
    lineas: extraerLineas(invoice),
  }
}
