import { StatTile } from '../StatTile.jsx'
import { formatearMoneda } from '../../lib/formato.js'

function cantidadPorEstado(resumen, estado) {
  return resumen.porEstado.find((e) => e.estado === estado)?.cantidad ?? 0
}

export function ResumenKpis({ resumen }) {
  if (!resumen) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatTile key={i} label="—" value={null} />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatTile label="Documentos" value={resumen.totalDocumentos} />
      <StatTile label="Valor total" value={formatearMoneda(resumen.totalValor)} />
      <StatTile label="Pendientes de revisión" value={cantidadPorEstado(resumen, 'PENDIENTE_REVISION')} />
      <StatTile label="Aprobados" value={cantidadPorEstado(resumen, 'APROBADO')} />
    </div>
  )
}
