import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { api, mensajeDeError } from '../lib/api.js'
import { useAuth } from '../context/AuthContext.jsx'
import { formatearMoneda, formatearFecha } from '../lib/formato.js'

// Conciliación (resto de Fase 15): el sistema solo SUGIERE candidatos
// (misma cuenta, tipo correcto, valor/fecha dentro de tolerancia) — el
// usuario siempre confirma con qué pago/recaudo corresponde cada línea,
// nunca se concilia automáticamente.
export function ExtractoDetallePage() {
  const { id } = useParams()
  const { empresaActual } = useAuth()
  const [extracto, setExtracto] = useState(null)
  const [error, setError] = useState(null)
  const [procesando, setProcesando] = useState(null)

  const puedeConciliar = ['ADMINISTRADOR', 'CONTADOR'].includes(empresaActual?.rolCodigo)

  function cargar() {
    api
      .obtenerExtracto(id)
      .then(setExtracto)
      .catch(() => setError('No se pudo cargar el extracto'))
  }

  useEffect(cargar, [id])

  async function conciliar(lineaId, pagoId) {
    setError(null)
    setProcesando(lineaId)
    try {
      await api.conciliarLinea(lineaId, pagoId)
      cargar()
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo conciliar'))
    } finally {
      setProcesando(null)
    }
  }

  async function desconciliar(lineaId) {
    setError(null)
    setProcesando(lineaId)
    try {
      await api.desconciliarLinea(lineaId)
      cargar()
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo desconciliar'))
    } finally {
      setProcesando(null)
    }
  }

  if (error && !extracto) {
    return <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">{error}</p>
  }
  if (!extracto) return <p className="text-sm text-slate-400">Cargando…</p>

  const conciliadas = extracto.lineas.filter((l) => l.conciliado).length

  return (
    <div className="space-y-4">
      <Link to="/bancos" className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft size={15} /> Volver a Bancos
      </Link>

      <div>
        <h1 className="text-xl font-semibold text-slate-800">Extracto bancario</h1>
        <p className="text-sm text-slate-500">
          {formatearFecha(extracto.periodoInicio)} — {formatearFecha(extracto.periodoFin)} · {conciliadas} de{' '}
          {extracto.lineas.length} líneas conciliadas
        </p>
      </div>

      {error && <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">{error}</p>}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-xs text-slate-400">
              <th className="px-4 py-2 font-medium">Fecha</th>
              <th className="px-4 py-2 font-medium">Descripción</th>
              <th className="px-4 py-2 font-medium">Débito</th>
              <th className="px-4 py-2 font-medium">Crédito</th>
              <th className="px-4 py-2 font-medium">Conciliación</th>
            </tr>
          </thead>
          <tbody>
            {extracto.lineas.map((linea) => (
              <tr key={linea.id} className="border-b border-slate-50 last:border-0">
                <td className="px-4 py-2 text-slate-500">{formatearFecha(linea.fecha)}</td>
                <td className="px-4 py-2 text-slate-600">{linea.descripcion}</td>
                <td className="px-4 py-2 text-slate-700">{linea.debito > 0 ? formatearMoneda(linea.debito) : '—'}</td>
                <td className="px-4 py-2 text-slate-700">{linea.credito > 0 ? formatearMoneda(linea.credito) : '—'}</td>
                <td className="px-4 py-2">
                  {linea.conciliado ? (
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        {linea.pago?.tipo} — {linea.pago?.tercero?.razonSocial || formatearMoneda(linea.pago?.valor)}
                      </span>
                      {puedeConciliar && (
                        <button
                          type="button"
                          onClick={() => desconciliar(linea.id)}
                          disabled={procesando === linea.id}
                          className="text-xs font-medium text-red-600 hover:text-red-500 disabled:opacity-50"
                        >
                          Desconciliar
                        </button>
                      )}
                    </div>
                  ) : !puedeConciliar ? (
                    <span className="text-xs text-slate-400">Sin conciliar</span>
                  ) : linea.sugerencias?.length > 0 ? (
                    <div className="flex flex-col gap-1">
                      {linea.sugerencias.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => conciliar(linea.id, s.id)}
                          disabled={procesando === linea.id}
                          className="w-fit rounded-lg border border-indigo-200 px-2 py-1 text-left text-xs text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
                        >
                          Conciliar con {s.tercero?.razonSocial || s.tipo} — {formatearMoneda(s.valor)} ({formatearFecha(s.fecha)})
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">Sin sugerencias — registra el pago/recaudo con esta cuenta</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
