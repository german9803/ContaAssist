import { useEffect, useState } from 'react'
import { Users, UserPlus, X } from 'lucide-react'
import { api, mensajeDeError } from '../lib/api.js'
import { useAuth } from '../context/AuthContext.jsx'
import { TIPOS_IDENTIFICACION, TIPOS_TERCERO } from '../lib/tercerosConstantes.js'

const FORM_VACIO = {
  tipoIdentificacion: 'NIT',
  identificacion: '',
  dv: '',
  razonSocial: '',
  tipoTercero: 'PROVEEDOR',
  email: '',
  telefono: '',
  ciudad: '',
}

function aFormulario(t) {
  return {
    tipoIdentificacion: t.tipoIdentificacion,
    identificacion: t.identificacion,
    dv: t.dv || '',
    razonSocial: t.razonSocial,
    tipoTercero: t.tipoTercero,
    email: t.email || '',
    telefono: t.telefono || '',
    ciudad: t.ciudad || '',
  }
}

export function TercerosPage() {
  const { empresaId, empresaActual } = useAuth()
  const [terceros, setTerceros] = useState(null)
  const [error, setError] = useState(null)
  const [filtros, setFiltros] = useState({ q: '', tipo: '' })

  const [formAbierto, setFormAbierto] = useState(false)
  const [editando, setEditando] = useState(null) // null = creando; objeto = editando
  const [form, setForm] = useState(FORM_VACIO)
  const [guardando, setGuardando] = useState(false)

  const puedeEditar = ['ADMINISTRADOR', 'AUXILIAR_CONTABLE', 'CONTADOR'].includes(empresaActual?.rolCodigo)

  function cargar() {
    setTerceros(null)
    api
      .listarTerceros({ q: filtros.q, tipo: filtros.tipo, pageSize: 50 })
      .then((res) => setTerceros(res.data))
      .catch(() => setError('No se pudo cargar la lista de terceros'))
  }

  useEffect(cargar, [empresaId, filtros])

  function abrirCrear() {
    setEditando(null)
    setForm(FORM_VACIO)
    setFormAbierto(true)
    setError(null)
  }

  function abrirEditar(tercero) {
    setEditando(tercero)
    setForm(aFormulario(tercero))
    setFormAbierto(true)
    setError(null)
  }

  async function handleGuardar(e) {
    e.preventDefault()
    setError(null)
    setGuardando(true)
    try {
      if (editando) {
        await api.actualizarTercero(editando.id, {
          razonSocial: form.razonSocial,
          tipoTercero: form.tipoTercero,
          email: form.email || null,
          telefono: form.telefono || null,
          ciudad: form.ciudad || null,
        })
      } else {
        await api.crearTercero({
          tipoIdentificacion: form.tipoIdentificacion,
          identificacion: form.identificacion,
          dv: form.dv || undefined,
          razonSocial: form.razonSocial,
          tipoTercero: form.tipoTercero,
          email: form.email || null,
          telefono: form.telefono || null,
          ciudad: form.ciudad || null,
        })
      }
      setFormAbierto(false)
      cargar()
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo guardar el tercero'))
    } finally {
      setGuardando(false)
    }
  }

  async function handleToggleActivo(tercero) {
    try {
      await api.actualizarTercero(tercero.id, { activo: !tercero.activo })
      cargar()
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo actualizar el tercero'))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Terceros</h1>
          <p className="text-sm text-slate-500">Clientes, proveedores y otros terceros de la empresa</p>
        </div>
        {puedeEditar && (
          <button
            type="button"
            onClick={abrirCrear}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            <UserPlus size={16} /> Nuevo tercero
          </button>
        )}
      </div>

      {formAbierto && (
        <section className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">{editando ? 'Editar tercero' : 'Nuevo tercero'}</h2>
            <button type="button" onClick={() => setFormAbierto(false)} className="text-slate-400 hover:text-slate-600">
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleGuardar} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Campo label="Tipo ID">
              <select
                value={form.tipoIdentificacion}
                disabled={Boolean(editando)}
                onChange={(e) => setForm((f) => ({ ...f, tipoIdentificacion: e.target.value }))}
                className={CAMPO}
              >
                {TIPOS_IDENTIFICACION.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo label="Identificación">
              <input
                required
                value={form.identificacion}
                disabled={Boolean(editando)}
                onChange={(e) => setForm((f) => ({ ...f, identificacion: e.target.value }))}
                className={CAMPO}
              />
            </Campo>
            {form.tipoIdentificacion === 'NIT' && (
              <Campo label="DV (opcional, se calcula solo)">
                <input
                  value={form.dv}
                  disabled={Boolean(editando)}
                  onChange={(e) => setForm((f) => ({ ...f, dv: e.target.value }))}
                  className={CAMPO}
                />
              </Campo>
            )}
            <Campo label="Tipo de tercero">
              <select
                value={form.tipoTercero}
                onChange={(e) => setForm((f) => ({ ...f, tipoTercero: e.target.value }))}
                className={CAMPO}
              >
                {TIPOS_TERCERO.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Campo>

            <Campo label="Razón social" className="col-span-2 sm:col-span-2">
              <input
                required
                value={form.razonSocial}
                onChange={(e) => setForm((f) => ({ ...f, razonSocial: e.target.value }))}
                className={CAMPO}
              />
            </Campo>
            <Campo label="Email">
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className={CAMPO}
              />
            </Campo>
            <Campo label="Teléfono">
              <input
                value={form.telefono}
                onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
                className={CAMPO}
              />
            </Campo>
            <Campo label="Ciudad" className="col-span-2 sm:col-span-1">
              <input
                value={form.ciudad}
                onChange={(e) => setForm((f) => ({ ...f, ciudad: e.target.value }))}
                className={CAMPO}
              />
            </Campo>

            {error && <p className="col-span-full rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

            <div className="col-span-full flex justify-end gap-2">
              <button
                type="submit"
                disabled={guardando}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
              >
                {guardando ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </form>
        </section>
      )}

      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Buscar por nombre o identificación"
          value={filtros.q}
          onChange={(e) => setFiltros((f) => ({ ...f, q: e.target.value }))}
          className="w-64 max-w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
        <select
          value={filtros.tipo}
          onChange={(e) => setFiltros((f) => ({ ...f, tipo: e.target.value }))}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        >
          <option value="">Todos los tipos</option>
          {TIPOS_TERCERO.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {error && !formAbierto && <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">{error}</p>}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {terceros === null ? (
          <p className="p-4 text-sm text-slate-400">Cargando…</p>
        ) : terceros.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-14 text-center text-slate-400">
            <Users size={26} strokeWidth={1.5} />
            <p className="text-sm">No hay terceros con estos filtros.</p>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs text-slate-400">
                <th className="px-4 py-2 font-medium">Identificación</th>
                <th className="px-4 py-2 font-medium">Razón social</th>
                <th className="px-4 py-2 font-medium">Tipo</th>
                <th className="px-4 py-2 font-medium">Ciudad</th>
                <th className="px-4 py-2 font-medium">Estado</th>
                <th className="px-4 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {terceros.map((t) => (
                <tr key={t.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-2 text-slate-600">
                    {t.tipoIdentificacion} {t.identificacion}
                    {t.dv ? `-${t.dv}` : ''}
                  </td>
                  <td className="px-4 py-2 font-medium text-slate-700">{t.razonSocial}</td>
                  <td className="px-4 py-2">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{t.tipoTercero}</span>
                  </td>
                  <td className="px-4 py-2 text-slate-500">{t.ciudad || '—'}</td>
                  <td className="px-4 py-2">
                    <button
                      type="button"
                      disabled={!puedeEditar}
                      onClick={() => handleToggleActivo(t)}
                      className={`rounded-full px-2.5 py-1 text-xs font-medium disabled:opacity-60 ${
                        t.activo ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {t.activo ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                  <td className="px-4 py-2 text-right">
                    {puedeEditar && (
                      <button
                        type="button"
                        onClick={() => abrirEditar(t)}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-500"
                      >
                        Editar
                      </button>
                    )}
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

const CAMPO = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-100 disabled:text-slate-400'

function Campo({ label, className = '', children }) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-medium text-slate-500">{label}</label>
      {children}
    </div>
  )
}
