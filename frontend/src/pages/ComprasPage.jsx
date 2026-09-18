import { DocumentosPorTipo } from '../components/documentos/DocumentosPorTipo.jsx'

export function ComprasPage() {
  return (
    <DocumentosPorTipo
      tipoDocumento="FACTURA_COMPRA"
      titulo="Compras"
      descripcion="Facturas de compra recibidas de proveedores"
      mensajeVacio="Todavía no hay facturas de compra. Súbelas desde el Centro de Carga."
    />
  )
}
