import { PagosPorTipo } from '../components/pagos/PagosPorTipo.jsx'

export function CuentasPorPagarPage() {
  return (
    <PagosPorTipo
      tipo="PAGO"
      titulo="Cuentas por pagar"
      descripcion="Facturas de compra aprobadas pendientes de pago a proveedores"
      mensajeVacio="No hay facturas de compra pendientes de pago."
    />
  )
}
