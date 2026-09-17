import { CheckCircle2, XCircle } from 'lucide-react'

export function ListaValidaciones({ validaciones }) {
  if (!validaciones || validaciones.length === 0) {
    return <p className="text-sm text-slate-400">Sin resultados de validación todavía.</p>
  }

  return (
    <ul className="space-y-1.5">
      {validaciones.map((v) => (
        <li key={v.codigo} className="flex items-start gap-2 text-sm">
          {v.resultado === 'OK' ? (
            <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-500" />
          ) : (
            <XCircle size={16} className={`mt-0.5 shrink-0 ${v.severidad === 'BLOQUEANTE' ? 'text-red-500' : 'text-amber-500'}`} />
          )}
          <span className="min-w-0">
            <span className="font-medium text-slate-700">{v.codigo}</span>
            {v.mensaje && <span className="block text-xs text-slate-500">{v.mensaje}</span>}
          </span>
        </li>
      ))}
    </ul>
  )
}
