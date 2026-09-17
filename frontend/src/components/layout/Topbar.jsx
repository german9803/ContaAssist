import { useNavigate } from 'react-router-dom'
import { LogOut, Building2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'

export function Topbar() {
  const { usuario, empresaId, empresaActual, cambiarEmpresa, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div className="flex items-center gap-2 text-slate-500">
        <Building2 size={18} strokeWidth={1.75} />
        {usuario.empresas.length > 1 ? (
          <select
            value={empresaId || ''}
            onChange={(e) => cambiarEmpresa(e.target.value)}
            className="rounded-md border-none bg-transparent text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          >
            {usuario.empresas.map((e) => (
              <option key={e.empresaId} value={e.empresaId}>
                {e.empresaNombre}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-sm font-medium text-slate-700">{empresaActual?.empresaNombre}</span>
        )}
        {empresaActual && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
            {empresaActual.rolCodigo}
          </span>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-medium text-slate-700">{usuario.nombreCompleto}</p>
          <p className="text-xs text-slate-400">{usuario.email}</p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-800"
        >
          <LogOut size={16} strokeWidth={1.75} />
          Salir
        </button>
      </div>
    </header>
  )
}
