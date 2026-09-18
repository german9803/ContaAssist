import { useState } from 'react'
import { EquipoPage } from './configuracion/EquipoPage.jsx'
import { CatalogosContablesPage } from './configuracion/CatalogosContablesPage.jsx'

const TABS = [
  { id: 'equipo', etiqueta: 'Equipo' },
  { id: 'catalogos', etiqueta: 'Catálogos contables' },
]

export function ConfiguracionPage() {
  const [tab, setTab] = useState('equipo')

  return (
    <div className="space-y-6">
      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.id ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.etiqueta}
          </button>
        ))}
      </div>

      {tab === 'equipo' ? <EquipoPage /> : <CatalogosContablesPage />}
    </div>
  )
}
