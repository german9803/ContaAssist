import { PagosPorTipo } from '../components/pagos/PagosPorTipo.jsx'

export function CarteraPage() {
  return (
    <PagosPorTipo
      tipo="RECAUDO"
      titulo="Cartera"
      descripcion="Facturas de venta aprobadas pendientes de recaudo de clientes"
      mensajeVacio="No hay facturas de venta pendientes de recaudo."
    />
  )
}
