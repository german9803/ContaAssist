import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileText } from 'lucide-react'
import { api } from '../lib/api.js'
import { useAuth } from '../context/AuthContext.jsx'
import { TIPOS_DOCUMENTO } from '../lib/tiposDocumento.js'
import { EstadoBadge } from '../components/carga/EstadoBadge.jsx'

function formatearMoneda(valor) {
  if (valor === null || valor === undefined) return '—'
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(valor)
}

function formatearFecha(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-CO', { dateStyle: 'medium' })
}

export function DocumentosPage() {
  const { empresaId } = useAuth()
  const [documentos, setDocumentos] = useState(null)
  const [error, setError] = useState(null)
  const [tipoDocumento, setTipoDocumento] = useState('')

  useEffect(() => {
    setDocumentos(null)
    api
      .listarDocumentos({ pageSize: 50, ...(tipoDocumento ? { tipoDocumento } : {}) })
      .then((res) => setDocumentos(res.data))
      .catch(() => setError('No se pudo cargar la lista de documentos'))
  }, [empresaId, tipoDocumento])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Documentos</h1>
          <p className="text-sm text-slate-500">Facturas y documentos extraídos del Centro de Carga</p>
        </div>
        <select
          value={tipoDocumento}
          onChange={(e) => setTipoDocumento(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        >
          <option value="">Todos los tipos</option>
          {TIPOS_DOCUMENTO.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">{error}</p>}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {documentos === null ? (
          <p className="p-4 text-sm text-slate-400">Cargando…</p>
        ) : documentos.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-14 text-center text-slate-400">
            <FileText size={26} strokeWidth={1.5} />
            <p className="text-sm">Todavía no hay documentos. Sube archivos desde el Centro de Carga.</p>
          </div>
        ) : (
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
        )}
      </div>
    </div>
  )
}
