import { useEffect, useState } from 'react'
import { api } from '../../lib/api.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { FiltrosDocumentos } from './FiltrosDocumentos.jsx'
import { TablaDocumentos } from './TablaDocumentos.jsx'
import { ResumenKpis } from './ResumenKpis.jsx'

// Compras y Ventas (Fase 9) son la misma pantalla con el tipo de documento
// fijo — se implementan una sola vez y cada página solo aporta el título y el
// tipoDocumento que le corresponde.
export function DocumentosPorTipo({ tipoDocumento, titulo, descripcion, mensajeVacio }) {
  const { empresaId } = useAuth()
  const [documentos, setDocumentos] = useState(null)
  const [resumen, setResumen] = useState(null)
  const [error, setError] = useState(null)
  const [filtros, setFiltros] = useState({})

  useEffect(() => {
    setDocumentos(null)
    setResumen(null)
    const filtrosCompletos = { tipoDocumento, ...filtros }

    api
      .listarDocumentos({ pageSize: 50, ...filtrosCompletos })
      .then((res) => setDocumentos(res.data))
      .catch(() => setError('No se pudo cargar la lista de documentos'))

    api
      .obtenerResumenDocumentos(filtrosCompletos)
      .then(setResumen)
      .catch(() => setError('No se pudo cargar el resumen'))
  }, [empresaId, tipoDocumento, filtros])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">{titulo}</h1>
        <p className="text-sm text-slate-500">{descripcion}</p>
      </div>

      <ResumenKpis resumen={resumen} />

      <FiltrosDocumentos valores={filtros} onChange={setFiltros} mostrarTipo={false} />

      {error && <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">{error}</p>}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <TablaDocumentos documentos={documentos} mensajeVacio={mensajeVacio} />
      </div>
    </div>
  )
}
