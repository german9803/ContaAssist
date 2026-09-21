import { useEffect, useState } from 'react'
import { api, mensajeDeError } from '../../lib/api.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { StatTile } from '../StatTile.jsx'
import { formatearMoneda, formatearFecha } from '../../lib/formato.js'
import { ModalRegistrarPago } from './ModalRegistrarPago.jsx'
import { HistorialPagos } from './HistorialPagos.jsx'

const ESTILOS_ESTADO = {
  PENDIENTE: 'bg-slate-100 text-slate-600',
  PARCIAL: 'bg-amber-50 text-amber-700',
  PAGADO: 'bg-emerald-50 text-emerald-700',
}

function BadgeEstadoCartera({ estado, vencido }) {
  if (vencido) return <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">VENCIDO</span>
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ESTILOS_ESTADO[estado] || 'bg-slate-100 text-slate-600'}`}>{estado}</span>
}

// Cartera y Cuentas por pagar (Fase 15) son la misma pantalla con `tipo` fijo
// (PAGO/RECAUDO) — mismo patrón que Compras/Ventas (Fase 9,
// DocumentosPorTipo.jsx): se implementa una sola vez.
export function PagosPorTipo({ tipo, titulo, descripcion, mensajeVacio }) {
  const { empresaId, empresaActual } = useAuth()
  const puedeRegistrar = ['ADMINISTRADOR', 'CONTADOR'].includes(empresaActual?.rolCodigo)

  const [resumen, setResumen] = useState(null)
  const [documentos, setDocumentos] = useState(null)
  const [pagos, setPagos] = useState(null)
  const [formasPago, setFormasPago] = useState([])
  const [cuentasBancarias, setCuentasBancarias] = useState([])
  const [filtroEstado, setFiltroEstado] = useState('')
  const [buscarTercero, setBuscarTercero] = useState('')
  const [error, setError] = useState(null)
  const [documentoParaPago, setDocumentoParaPago] = useState(null)

  function cargar() {
    setError(null)
    api.obtenerResumenCartera({ tipo }).then(setResumen).catch(() => setError('No se pudo cargar el resumen'))
    api
      .listarDocumentosConSaldo({ tipo, estadoCartera: filtroEstado || undefined, tercero: buscarTercero || undefined, pageSize: 100 })
      .then((res) => setDocumentos(res.data))
      .catch(() => setError('No se pudo cargar la lista de documentos'))
    api
      .listarPagos({ tipo, pageSize: 50 })
      .then((res) => setPagos(res.data))
      .catch(() => setError('No se pudo cargar el historial'))
  }

  useEffect(() => {
    api.listarFormasPago().then(setFormasPago).catch(() => {})
    api.listarCuentasBancarias().then(setCuentasBancarias).catch(() => {})
  }, [empresaId])

  useEffect(cargar, [empresaId, tipo, filtroEstado, buscarTercero])

  async function handleAnular(pagoId) {
    try {
      await api.anularPago(pagoId)
      cargar()
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo anular'))
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">{titulo}</h1>
        <p className="text-sm text-slate-500">{descripcion}</p>
      </div>

      {error && <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Pendiente" value={resumen ? formatearMoneda(resumen.totalPendiente) : null} />
        <StatTile label="Vencido" value={resumen ? formatearMoneda(resumen.totalVencido) : null} />
        <StatTile label="Documentos pendientes" value={resumen?.cantidadPendientes ?? null} />
        <StatTile label="Documentos vencidos" value={resumen?.cantidadVencidos ?? null} />
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Todos los estados</option>
          <option value="PENDIENTE">Pendiente</option>
          <option value="PARCIAL">Parcial</option>
          <option value="PAGADO">Pagado</option>
        </select>
        <input
          placeholder="Buscar tercero (nombre o NIT)"
          value={buscarTercero}
          onChange={(e) => setBuscarTercero(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {documentos === null ? (
          <p className="p-4 text-sm text-slate-400">Cargando…</p>
        ) : documentos.length === 0 ? (
          <p className="p-4 text-sm text-slate-400">{mensajeVacio}</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs text-slate-400">
                <th className="px-4 py-2 font-medium">Número</th>
                <th className="px-4 py-2 font-medium">Tercero</th>
                <th className="px-4 py-2 font-medium">Vencimiento</th>
                <th className="px-4 py-2 font-medium">Total</th>
                <th className="px-4 py-2 font-medium">Saldo</th>
                <th className="px-4 py-2 font-medium">Estado</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {documentos.map((doc) => (
                <tr key={doc.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-2 text-slate-600">{doc.numeroDocumento || '—'}</td>
                  <td className="px-4 py-2 text-slate-600">{doc.tercero?.razonSocial || '—'}</td>
                  <td className="px-4 py-2 text-slate-500">{formatearFecha(doc.fechaVencimiento)}</td>
                  <td className="px-4 py-2 text-slate-700">{formatearMoneda(doc.total)}</td>
                  <td className="px-4 py-2 text-slate-700">{formatearMoneda(doc.saldoPendiente)}</td>
                  <td className="px-4 py-2">
                    <BadgeEstadoCartera estado={doc.estadoCartera} vencido={doc.vencido} />
                  </td>
                  <td className="px-4 py-2 text-right">
                    {puedeRegistrar && doc.estadoCartera !== 'PAGADO' && (
                      <button
                        type="button"
                        onClick={() => setDocumentoParaPago(doc)}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-500"
                      >
                        {tipo === 'PAGO' ? 'Registrar pago' : 'Registrar recaudo'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-600">Historial</h2>
        <HistorialPagos pagos={pagos} puedeAnular={puedeRegistrar} onAnular={handleAnular} />
      </section>

      {documentoParaPago && (
        <ModalRegistrarPago
          tipo={tipo}
          documentoInicial={documentoParaPago}
          documentosPendientes={documentos}
          formasPago={formasPago}
          cuentasBancarias={cuentasBancarias}
          onClose={() => setDocumentoParaPago(null)}
          onRegistrado={() => {
            setDocumentoParaPago(null)
            cargar()
          }}
        />
      )}
    </div>
  )
}
