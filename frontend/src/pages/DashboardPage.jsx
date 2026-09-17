import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowUpRight, Inbox, Send } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../lib/api.js'
import { StatTile } from '../components/StatTile.jsx'

const PIPELINE = [
  { label: 'Recibidos', nota: 'Centro de carga — Fase 6' },
  { label: 'Procesados', nota: 'Fase 7' },
  { label: 'Pendientes de revisión', nota: 'Fase 8' },
  { label: 'Con errores', nota: 'Fase 8' },
  { label: 'Aprobados', nota: 'Fase 8' },
  { label: 'Listos para exportar', nota: 'Fase 11' },
  { label: 'Exportados', nota: 'Fase 13' },
]

export function DashboardPage() {
  const { empresaActual, empresaId } = useAuth()
  const [equipo, setEquipo] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelado = false
    setEquipo(null)
    api
      .listarUsuariosEmpresa(empresaId)
      .then((data) => !cancelado && setEquipo(data))
      .catch(() => !cancelado && setError('No se pudo cargar el equipo de la empresa'))
    return () => {
      cancelado = true
    }
  }, [empresaId])

  const miembrosActivos = equipo?.filter((m) => m.activo) ?? []
  const administradores = miembrosActivos.filter((m) => m.rolCodigo === 'ADMINISTRADOR')
  const soloUnAdmin = equipo !== null && administradores.length === 1

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">{empresaActual?.empresaNombre}</h1>
        <p className="text-sm text-slate-500">Panel operativo de ContaAssist</p>
      </div>

      {soloUnAdmin && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle className="mt-0.5 shrink-0 text-amber-500" size={18} />
          <div className="text-sm text-amber-800">
            Esta empresa tiene un solo administrador activo. Si pierdes acceso a esta cuenta, nadie más podrá
            gestionar usuarios.{' '}
            <Link to="/configuracion" className="font-medium underline underline-offset-2">
              Invitar otro administrador
            </Link>
          </div>
        </div>
      )}
      {error && <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">{error}</p>}

      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-600">Documentos</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
          {PIPELINE.map((tile) => (
            <StatTile key={tile.label} label={tile.label} value={null} nota={tile.nota} />
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-600">Equipo</h2>
            <Link
              to="/configuracion"
              className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-500"
            >
              Gestionar <ArrowUpRight size={14} />
            </Link>
          </div>

          {equipo === null ? (
            <p className="text-sm text-slate-400">Cargando…</p>
          ) : (
            <>
              <p className="mb-3 text-2xl font-semibold text-slate-800">{miembrosActivos.length}</p>
              <ul className="space-y-1.5">
                {miembrosActivos.slice(0, 5).map((m) => (
                  <li key={m.usuarioId} className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">{m.nombreCompleto}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                      {m.rolCodigo}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-600">Últimas cargas y exportaciones</h2>
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-slate-400">
            <div className="flex gap-3">
              <Inbox size={22} strokeWidth={1.5} />
              <Send size={22} strokeWidth={1.5} />
            </div>
            <p className="text-sm">Aparecerán aquí cuando el Centro de Carga (Fase 6) y las Exportaciones (Fase 13) estén disponibles.</p>
          </div>
        </section>
      </div>
    </div>
  )
}
