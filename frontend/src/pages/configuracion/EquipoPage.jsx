import { useEffect, useState } from 'react'
import { UserPlus } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { api, ApiError } from '../../lib/api.js'

const ROLES = ['ADMINISTRADOR', 'AUXILIAR_CONTABLE', 'CONTADOR', 'CONSULTA']
const INVITACION_INICIAL = { email: '', nombreCompleto: '', rolCodigo: 'AUXILIAR_CONTABLE' }

export function EquipoPage() {
  const { empresaId, empresaActual, refrescarPerfil } = useAuth()
  const [equipo, setEquipo] = useState(null)
  const [error, setError] = useState(null)
  const [form, setForm] = useState(INVITACION_INICIAL)
  const [enviando, setEnviando] = useState(false)
  const [passwordGenerada, setPasswordGenerada] = useState(null)

  const esAdministrador = empresaActual?.rolCodigo === 'ADMINISTRADOR'

  async function cargarEquipo() {
    setEquipo(null)
    try {
      setEquipo(await api.listarUsuariosEmpresa(empresaId))
    } catch {
      setError('No se pudo cargar el equipo')
    }
  }

  useEffect(() => {
    cargarEquipo()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId])

  async function handleInvitar(e) {
    e.preventDefault()
    setError(null)
    setPasswordGenerada(null)
    setEnviando(true)
    try {
      const resultado = await api.invitarUsuario(empresaId, form)
      if (resultado.passwordTemporal) {
        setPasswordGenerada({ email: resultado.email, password: resultado.passwordTemporal })
      }
      setForm(INVITACION_INICIAL)
      await cargarEquipo()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo invitar al usuario')
    } finally {
      setEnviando(false)
    }
  }

  async function handleCambiarRol(usuarioId, rolCodigo) {
    setError(null)
    try {
      await api.actualizarMembresia(empresaId, usuarioId, { rolCodigo })
      await cargarEquipo()
      await refrescarPerfil()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cambiar el rol')
    }
  }

  async function handleCambiarActivo(usuarioId, activo) {
    setError(null)
    try {
      await api.actualizarMembresia(empresaId, usuarioId, { activo })
      await cargarEquipo()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo actualizar el usuario')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Equipo</h1>
        <p className="text-sm text-slate-500">Usuarios con acceso a {empresaActual?.empresaNombre}</p>
      </div>

      {error && <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">{error}</p>}

      {passwordGenerada && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-800">
          Usuario <strong>{passwordGenerada.email}</strong> creado con contraseña temporal:{' '}
          <code className="rounded bg-white px-1.5 py-0.5">{passwordGenerada.password}</code>. Compártesela — todavía
          no hay envío automático de correo de invitación.
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-600">Miembros</h2>
        {equipo === null ? (
          <p className="text-sm text-slate-400">Cargando…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs text-slate-400">
                  <th className="pb-2 font-medium">Nombre</th>
                  <th className="pb-2 font-medium">Email</th>
                  <th className="pb-2 font-medium">Rol</th>
                  <th className="pb-2 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {equipo.map((m) => (
                  <tr key={m.usuarioId} className="border-b border-slate-50 last:border-0">
                    <td className="py-2 text-slate-700">{m.nombreCompleto}</td>
                    <td className="py-2 text-slate-500">{m.email}</td>
                    <td className="py-2">
                      <select
                        value={m.rolCodigo}
                        disabled={!esAdministrador}
                        onChange={(e) => handleCambiarRol(m.usuarioId, e.target.value)}
                        className="rounded-md border border-slate-200 px-2 py-1 text-xs disabled:bg-slate-50 disabled:text-slate-400"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2">
                      <button
                        type="button"
                        disabled={!esAdministrador}
                        onClick={() => handleCambiarActivo(m.usuarioId, !m.activo)}
                        className={`rounded-full px-2.5 py-1 text-xs font-medium disabled:opacity-60 ${
                          m.activo ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {m.activo ? 'Activo' : 'Inactivo'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {esAdministrador && (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-600">
            <UserPlus size={16} /> Invitar usuario
          </h2>
          <form onSubmit={handleInvitar} className="grid gap-3 sm:grid-cols-4">
            <input
              type="email"
              required
              placeholder="email@empresa.com"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 sm:col-span-2"
            />
            <input
              type="text"
              placeholder="Nombre completo (si es nuevo)"
              value={form.nombreCompleto}
              onChange={(e) => setForm((f) => ({ ...f, nombreCompleto: e.target.value }))}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
            <select
              value={form.rolCodigo}
              onChange={(e) => setForm((f) => ({ ...f, rolCodigo: e.target.value }))}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={enviando}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60 sm:col-span-4"
            >
              {enviando ? 'Invitando…' : 'Invitar'}
            </button>
          </form>
        </section>
      )}
    </div>
  )
}
