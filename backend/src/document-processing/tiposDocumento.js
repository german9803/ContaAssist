export const TIPOS_DOCUMENTO = [
  'FACTURA_COMPRA',
  'FACTURA_VENTA',
  'NOTA_CREDITO',
  'NOTA_DEBITO',
  'EXTRACTO_BANCARIO',
  'OTRO',
]

// El tipo de documento indica el rol del tercero: quien emite una factura de
// venta es un cliente para nosotros; quien nos factura una compra es un
// proveedor. Notas y extractos no lo determinan por sí solos — se clasifican
// como OTRO en vez de adivinar (buscarOCrearTercero reclasifica a AMBOS si
// ese mismo NIT ya apareció antes con un rol distinto).
export function tipoTerceroSegunDocumento(tipoDocumento) {
  if (tipoDocumento === 'FACTURA_COMPRA') return 'PROVEEDOR'
  if (tipoDocumento === 'FACTURA_VENTA') return 'CLIENTE'
  return 'OTRO'
}
