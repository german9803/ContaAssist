import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar.jsx'
import { Topbar } from './Topbar.jsx'
import { useAuth } from '../../context/AuthContext.jsx'

export function AppLayout() {
  const { usuario, empresaActual } = useAuth()

  if (!usuario.empresas.length) {
    return (
      <div className="flex h-svh items-center justify-center bg-slate-50 px-4 text-center">
        <p className="text-slate-500">Tu cuenta no tiene ninguna empresa asociada todavía.</p>
      </div>
    )
  }

  return (
    <div className="flex h-svh bg-slate-50">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">{empresaActual && <Outlet />}</main>
      </div>
    </div>
  )
}
