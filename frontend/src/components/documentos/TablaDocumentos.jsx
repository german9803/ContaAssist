import { Link } from 'react-router-dom'
import { FileText } from 'lucide-react'
import { EstadoBadge } from '../carga/EstadoBadge.jsx'
import { formatearMoneda, formatearFecha } from '../../lib/formato.js'

export function TablaDocumentos({ documentos, mensajeVacio = 'No hay documentos con estos filtros.' }) {
  if (documentos === null) {
    return <p className="p-4 text-sm text-slate-400">Cargando…</p>
  }

  if (documentos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-14 text-center text-slate-400">
        <FileText size={26} strokeWidth={1.5} />
        <p className="text-sm">{mensajeVacio}</p>
      </div>
    )
  }

  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-slate-100 text-xs text-slate-400">
          <th className="px-4 py-2 font-medium">Tipo</th>
          <th className="px-4 py-2 font-medium">Número</th>
          <th className="px-4 py-2 font-medium">Fecha</th>
          <th className="px-4 py-2 font-medium">Tercero</th>
          <th className="px-4 py-2 font-medium">Total</th>
          <th className="px-4 py-2 font-medium">Estado</th>
        </tr>
      </thead>
      <tbody>
        {documentos.map((doc) => (
          <tr key={doc.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
            <td className="px-4 py-2">
              <Link to={`/documentos/${doc.id}`} className="font-medium text-indigo-600 hover:text-indigo-500">
                {doc.tipoDocumento}
              </Link>
            </td>
            <td className="px-4 py-2 text-slate-600">{doc.numeroDocumento || '—'}</td>
            <td className="px-4 py-2 text-slate-500">{formatearFecha(doc.fechaEmision)}</td>
            <td className="px-4 py-2 text-slate-600">{doc.tercero?.razonSocial || '—'}</td>
            <td className="px-4 py-2 text-slate-700">{formatearMoneda(doc.total)}</td>
            <td className="px-4 py-2">
              <EstadoBadge estado={doc.estado} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
