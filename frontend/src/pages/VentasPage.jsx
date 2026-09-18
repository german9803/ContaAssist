import { DocumentosPorTipo } from '../components/documentos/DocumentosPorTipo.jsx'

export function VentasPage() {
  return (
    <DocumentosPorTipo
      tipoDocumento="FACTURA_VENTA"
      titulo="Ventas"
      descripcion="Facturas de venta emitidas a clientes"
      mensajeVacio="Todavía no hay facturas de venta. Súbelas desde el Centro de Carga."
    />
  )
}
