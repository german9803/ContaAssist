import { useState } from 'react'
import { Plus } from 'lucide-react'
import { mensajeDeError } from '../../lib/api.js'

const CAMPO = 'rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100'

// Cuentas contables, centros de costo y formas de pago comparten la misma
// forma: lista con código+nombre (+ campos extra opcionales) y un formulario
// de alta. Se implementa una sola vez en vez de tres páginas casi idénticas.
export function TablaCatalogo({ titulo, columnas, filas, camposFormulario, valoresIniciales, onCrear, puedeEditar }) {
  const [form, setForm] = useState(valoresIniciales)
  const [error, setError] = useState(null)
  const [guardando, setGuardando] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setGuardando(true)
    try {
      await onCrear(form)
      setForm(valoresIniciales)
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo guardar'))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-slate-600">{titulo}</h2>

      {filas === null ? (
        <p className="text-sm text-slate-400">Cargando…</p>
      ) : filas.length === 0 ? (
        <p className="mb-4 text-sm text-slate-400">Todavía no hay registros.</p>
      ) : (
        <table className="mb-4 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-xs text-slate-400">
              {columnas.map((c) => (
                <th key={c.campo} className="py-1.5 pr-4 font-medium">
                  {c.etiqueta}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((fila) => (
              <tr key={fila.id} className="border-b border-slate-50 last:border-0">
                {columnas.map((c) => (
                  <td key={c.campo} className="py-1.5 pr-4 text-slate-600">
                    {fila[c.campo]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {puedeEditar && (
        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
          {camposFormulario.map((campo) => (
            <div key={campo.nombre}>
              <label className="mb-1 block text-xs font-medium text-slate-500">{campo.etiqueta}</label>
              {campo.opciones ? (
                <select
                  value={form[campo.nombre]}
                  onChange={(e) => setForm((f) => ({ ...f, [campo.nombre]: e.target.value }))}
                  className={CAMPO}
                >
                  {campo.opciones.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  required
                  value={form[campo.nombre]}
                  onChange={(e) => setForm((f) => ({ ...f, [campo.nombre]: e.target.value }))}
                  className={`${CAMPO} w-32`}
                />
              )}
            </div>
          ))}
          <button
            type="submit"
            disabled={guardando}
            className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            <Plus size={14} /> Agregar
          </button>
        </form>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </section>
  )
}
