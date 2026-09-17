import { Fragment, useEffect, useState } from 'react'
import { ChevronDown, ChevronRight, FileText } from 'lucide-react'
import { api } from '../../lib/api.js'
import { EstadoBadge } from './EstadoBadge.jsx'

function formatearFecha(iso) {
  return new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
}

function FilaExpandida({ cargaId }) {
  const [archivos, setArchivos] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    api
      .listarArchivosDeCarga(cargaId)
      .then(setArchivos)
      .catch(() => setError('No se pudieron cargar los archivos'))
  }, [cargaId])

  if (error) return <p className="px-4 py-3 text-sm text-red-600">{error}</p>
  if (archivos === null) return <p className="px-4 py-3 text-sm text-slate-400">Cargando…</p>
  if (archivos.length === 0) return <p className="px-4 py-3 text-sm text-slate-400">Ningún archivo se guardó de esta carga.</p>

  return (
    <ul className="divide-y divide-slate-100 bg-slate-50 px-4">
      {archivos.map((archivo) => (
        <li key={archivo.id} className="flex items-center justify-between gap-3 py-2 text-sm">
          <span className="flex min-w-0 items-center gap-2 text-slate-600">
            <FileText size={15} className="shrink-0 text-slate-400" />
            <span className="truncate">{archivo.nombreOriginal}</span>
          </span>
          <span className="flex shrink-0 items-center gap-3">
            <EstadoBadge estado={archivo.estado} />
            <button
              type="button"
              onClick={() => api.abrirArchivoOriginal(cargaId, archivo.id).catch(() => {})}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-500"
            >
              Ver
            </button>
          </span>
        </li>
      ))}
    </ul>
  )
}

export function HistorialCargas({ cargas, cargando, error }) {
  const [expandida, setExpandida] = useState(null)

  if (cargando) return <p className="text-sm text-slate-400">Cargando historial…</p>
  if (error) return <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">{error}</p>
  if (cargas.length === 0) {
    return <p className="text-sm text-slate-400">Todavía no se ha subido ninguna carga.</p>
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-xs text-slate-400">
            <th className="w-8" />
            <th className="px-4 py-2 font-medium">Tipo</th>
            <th className="px-4 py-2 font-medium">Archivos</th>
            <th className="px-4 py-2 font-medium">Estado</th>
            <th className="px-4 py-2 font-medium">Fecha</th>
          </tr>
        </thead>
        <tbody>
          {cargas.map((carga) => (
            <Fragment key={carga.id}>
              <tr
                onClick={() => setExpandida(expandida === carga.id ? null : carga.id)}
                className="cursor-pointer border-b border-slate-50 last:border-0 hover:bg-slate-50"
              >
                <td className="pl-4 text-slate-400">
                  {expandida === carga.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </td>
                <td className="px-4 py-2 text-slate-700">{carga.tipoOrigen}</td>
                <td className="px-4 py-2 text-slate-600">{carga.cantidadArchivos}</td>
                <td className="px-4 py-2">
                  <EstadoBadge estado={carga.estado} />
                </td>
                <td className="px-4 py-2 text-slate-500">{formatearFecha(carga.iniciadoEn)}</td>
              </tr>
              {expandida === carga.id && (
                <tr>
                  <td colSpan={5} className="p-0">
                    <FilaExpandida cargaId={carga.id} />
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}
