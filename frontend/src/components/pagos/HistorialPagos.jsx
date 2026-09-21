import { formatearMoneda, formatearFecha } from '../../lib/formato.js'

export function HistorialPagos({ pagos, puedeAnular, onAnular }) {
  if (pagos === null) return <p className="text-sm text-slate-400">Cargando…</p>
  if (pagos.length === 0) return <p className="text-sm text-slate-400">Todavía no hay pagos/recaudos registrados.</p>

  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-slate-100 text-xs text-slate-400">
          <th className="px-4 py-2 font-medium">Fecha</th>
          <th className="px-4 py-2 font-medium">Tercero</th>
          <th className="px-4 py-2 font-medium">Valor</th>
          <th className="px-4 py-2 font-medium">Forma de pago</th>
          <th className="px-4 py-2 font-medium">Cuenta bancaria</th>
          <th className="px-4 py-2 font-medium">Estado</th>
          <th className="px-4 py-2" />
        </tr>
      </thead>
      <tbody>
        {pagos.map((p) => (
          <tr key={p.id} className="border-b border-slate-50 last:border-0">
            <td className="px-4 py-2 text-slate-500">{formatearFecha(p.fecha)}</td>
            <td className="px-4 py-2 text-slate-600">{p.tercero?.razonSocial}</td>
            <td className="px-4 py-2 text-slate-700">{formatearMoneda(p.valor)}</td>
            <td className="px-4 py-2 text-slate-500">{p.formaPago?.nombre || '—'}</td>
            <td className="px-4 py-2 text-slate-500">{p.cuentaBancaria ? `${p.cuentaBancaria.banco} — ${p.cuentaBancaria.numeroCuenta}` : '—'}</td>
            <td className="px-4 py-2">
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  p.estado === 'ANULADO' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
                }`}
              >
                {p.estado}
              </span>
            </td>
            <td className="px-4 py-2 text-right">
              {puedeAnular && p.estado === 'REGISTRADO' && (
                <button type="button" onClick={() => onAnular(p.id)} className="text-xs font-medium text-red-600 hover:text-red-500">
                  Anular
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
