import { NavLink } from 'react-router-dom'
import { FileStack } from 'lucide-react'
import { MODULOS } from '../../lib/navegacion.js'

export function Sidebar() {
  return (
    <aside className="flex h-svh w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center gap-2 px-5 py-5">
        <FileStack className="text-indigo-600" size={24} strokeWidth={1.75} />
        <span className="text-lg font-semibold tracking-tight text-slate-800">ContaAssist</span>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
        {MODULOS.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`
            }
          >
            <Icon size={18} strokeWidth={1.75} />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
