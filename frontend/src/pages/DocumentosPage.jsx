import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'
import { useAuth } from '../context/AuthContext.jsx'
import { FiltrosDocumentos } from '../components/documentos/FiltrosDocumentos.jsx'
import { TablaDocumentos } from '../components/documentos/TablaDocumentos.jsx'

export function DocumentosPage() {
  const { empresaId } = useAuth()
  const [documentos, setDocumentos] = useState(null)
  const [error, setError] = useState(null)
  const [filtros, setFiltros] = useState({})

  useEffect(() => {
    setDocumentos(null)
    api
      .listarDocumentos({ pageSize: 50, ...filtros })
      .then((res) => setDocumentos(res.data))
      .catch(() => setError('No se pudo cargar la lista de documentos'))
  }, [empresaId, filtros])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Documentos</h1>
        <p className="text-sm text-slate-500">Bandeja general de documentos extraídos del Centro de Carga</p>
      </div>

      <FiltrosDocumentos valores={filtros} onChange={setFiltros} />

      {error && <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">{error}</p>}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <TablaDocumentos
          documentos={documentos}
          mensajeVacio="Todavía no hay documentos. Sube archivos desde el Centro de Carga."
        />
      </div>
    </div>
  )
}
