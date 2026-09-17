import { useCallback, useEffect, useState } from 'react'
import { FileText } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { api, mensajeDeError } from '../lib/api.js'
import { TIPOS_ORIGEN } from '../lib/tiposArchivo.js'
import { DropzoneArchivos } from '../components/carga/DropzoneArchivos.jsx'
import { EstadoBadge } from '../components/carga/EstadoBadge.jsx'
import { HistorialCargas } from '../components/carga/HistorialCargas.jsx'

export function CentroCargaPage() {
  const { empresaId } = useAuth()

  const [tipoOrigen, setTipoOrigen] = useState('PDF')
  const [archivos, setArchivos] = useState([])
  const [subiendo, setSubiendo] = useState(false)
  const [progreso, setProgreso] = useState(0)
  const [error, setError] = useState(null)
  const [resultado, setResultado] = useState(null)

  const [historial, setHistorial] = useState([])
  const [cargandoHistorial, setCargandoHistorial] = useState(true)
  const [errorHistorial, setErrorHistorial] = useState(null)

  const cargarHistorial = useCallback(() => {
    setCargandoHistorial(true)
    api
      .listarCargas()
      .then((res) => setHistorial(res.data))
      .catch(() => setErrorHistorial('No se pudo cargar el historial de cargas'))
      .finally(() => setCargandoHistorial(false))
  }, [])

  useEffect(() => {
    cargarHistorial()
  }, [cargarHistorial, empresaId])

  const tipoSeleccionado = TIPOS_ORIGEN.find((t) => t.codigo === tipoOrigen)

  async function handleSubir() {
    setError(null)
    setResultado(null)
    setSubiendo(true)
    setProgreso(0)
    try {
      const carga = await api.subirCarga({ tipoOrigen, archivos, onProgress: setProgreso })
      setResultado(carga)
      setArchivos([])
      cargarHistorial()
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo completar la carga'))
    } finally {
      setSubiendo(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Centro de carga</h1>
        <p className="text-sm text-slate-500">Sube facturas y documentos para prepararlos en ContaAssist</p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <label className="mb-1 block text-sm font-medium text-slate-700">Tipo de archivo</label>
        <select
          value={tipoOrigen}
          onChange={(e) => {
            setTipoOrigen(e.target.value)
            setArchivos([])
          }}
          disabled={subiendo}
          className="mb-4 w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        >
          {TIPOS_ORIGEN.map((t) => (
            <option key={t.codigo} value={t.codigo}>
              {t.etiqueta}
            </option>
          ))}
        </select>

        <DropzoneArchivos
          archivos={archivos}
          onChange={setArchivos}
          accept={tipoSeleccionado?.accept}
          disabled={subiendo}
        />

        {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        {subiendo && (
          <div className="mt-4">
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full bg-indigo-500 transition-all" style={{ width: `${progreso}%` }} />
            </div>
            <p className="mt-1 text-xs text-slate-400">Subiendo… {progreso}%</p>
          </div>
        )}

        <button
          type="button"
          onClick={handleSubir}
          disabled={subiendo || archivos.length === 0}
          className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
        >
          {subiendo ? 'Subiendo…' : `Subir ${archivos.length || ''} archivo${archivos.length === 1 ? '' : 's'}`.trim()}
        </button>
      </section>

      {resultado && (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-600">Resultado de la carga</h2>
            <EstadoBadge estado={resultado.estado} />
          </div>
          <ul className="divide-y divide-slate-100">
            {resultado.archivos.map((archivo, i) => (
              <li key={archivo.id || i} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="flex min-w-0 items-center gap-2 text-slate-600">
                  <FileText size={15} className="shrink-0 text-slate-400" />
                  <span className="truncate">{archivo.nombreOriginal}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  {archivo.mensajeError && <span className="text-xs text-red-500">{archivo.mensajeError}</span>}
                  <EstadoBadge estado={archivo.estado} />
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-600">Historial de cargas</h2>
        <HistorialCargas cargas={historial} cargando={cargandoHistorial} error={errorHistorial} />
      </section>
    </div>
  )
}
