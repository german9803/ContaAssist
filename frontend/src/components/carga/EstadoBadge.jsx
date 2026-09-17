const ESTILOS = {
  RECIBIDO: 'bg-emerald-50 text-emerald-700',
  PROCESANDO: 'bg-amber-50 text-amber-700',
  PROCESADO: 'bg-emerald-50 text-emerald-700',
  ERROR: 'bg-red-50 text-red-700',
  RECHAZADO: 'bg-red-50 text-red-700',
}

export function EstadoBadge({ estado }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ESTILOS[estado] || 'bg-slate-100 text-slate-600'}`}>
      {estado}
    </span>
  )
}
