import { useState } from 'react'
import { api, mensajeDeError } from '../../lib/api.js'
import { formatearMoneda } from '../../lib/formato.js'

const CAMPO =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100'

// El valor total del pago se deriva de la suma de lo aplicado a cada
// documento seleccionado — no se pide aparte, evita el error de usuario de
// que no cuadre con lo que exige el backend (Σ aplicaciones === valor).
export function ModalRegistrarPago({ tipo, documentoInicial, documentosPendientes, formasPago, cuentasBancarias, onClose, onRegistrado }) {
  const tercero = documentoInicial.tercero
  const documentosDelTercero = documentosPendientes.filter((d) => d.tercero?.id === tercero?.id && d.estadoCartera !== 'PAGADO')

  const [seleccion, setSeleccion] = useState(() =>
    Object.fromEntries(documentosDelTercero.map((d) => [d.id, d.id === documentoInicial.id ? d.saldoPendiente : 0])),
  )
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [formaPagoId, setFormaPagoId] = useState('')
  const [cuentaBancariaId, setCuentaBancariaId] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [error, setError] = useState(null)
  const [guardando, setGuardando] = useState(false)

  const valorTotal = Object.values(seleccion).reduce((acc, v) => acc + (Number(v) || 0), 0)

  function actualizarValor(documentoId, valor) {
    setSeleccion((s) => ({ ...s, [documentoId]: valor }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    const aplicaciones = Object.entries(seleccion)
      .filter(([, v]) => Number(v) > 0)
      .map(([documentoId, valorAplicado]) => ({ documentoId, valorAplicado: Number(valorAplicado) }))

    if (aplicaciones.length === 0) {
      setError('Selecciona al menos un documento con un valor mayor a 0')
      return
    }

    setGuardando(true)
    try {
      await api.registrarPago({
        tipo,
        terceroId: tercero.id,
        fecha,
        valor: valorTotal,
        formaPagoId: formaPagoId || undefined,
        cuentaBancariaId: cuentaBancariaId || undefined,
        observaciones: observaciones || undefined,
        aplicaciones,
      })
      onRegistrado()
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo registrar'))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl">
        <h2 className="mb-1 text-base font-semibold text-slate-800">{tipo === 'PAGO' ? 'Registrar pago' : 'Registrar recaudo'}</h2>
        <p className="mb-4 text-sm text-slate-500">{tercero?.razonSocial}</p>

        {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="max-h-56 space-y-2 overflow-auto rounded-lg border border-slate-100 p-2">
            {documentosDelTercero.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="text-slate-600">
                  {doc.numeroDocumento || doc.id.slice(0, 8)} · saldo {formatearMoneda(doc.saldoPendiente)}
                </span>
                <input
                  type="number"
                  min="0"
                  max={doc.saldoPendiente}
                  step="0.01"
                  value={seleccion[doc.id] || ''}
                  onChange={(e) => actualizarValor(doc.id, e.target.value)}
                  className={`${CAMPO} w-28`}
                />
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between text-sm font-medium text-slate-700">
            <span>Valor total del {tipo === 'PAGO' ? 'pago' : 'recaudo'}</span>
            <span>{formatearMoneda(valorTotal)}</span>
          </div>

          <label className="block text-xs font-medium text-slate-500">
            Fecha
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={CAMPO} required />
          </label>

          <label className="block text-xs font-medium text-slate-500">
            Forma de pago
            <select value={formaPagoId} onChange={(e) => setFormaPagoId(e.target.value)} className={CAMPO}>
              <option value="">— Sin especificar —</option>
              {formasPago.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.codigo} — {f.nombre}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs font-medium text-slate-500">
            Cuenta bancaria
            <select value={cuentaBancariaId} onChange={(e) => setCuentaBancariaId(e.target.value)} className={CAMPO}>
              <option value="">— Sin especificar —</option>
              {cuentasBancarias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.banco} — {c.numeroCuenta}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs font-medium text-slate-500">
            Observaciones
            <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={2} className={CAMPO} />
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando || valorTotal <= 0}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
            >
              {guardando ? 'Guardando…' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
