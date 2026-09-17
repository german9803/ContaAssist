import { Construction } from 'lucide-react'

export function PlaceholderPage({ titulo, fase, nota }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-24 text-center">
      <Construction className="text-slate-300" size={40} strokeWidth={1.5} />
      <h2 className="mt-4 text-lg font-semibold text-slate-700">{titulo}</h2>
      <p className="mt-1 text-sm text-slate-400">
        {fase ? `Módulo en construcción — Fase ${fase} del roadmap.` : 'Módulo en construcción.'}
      </p>
      {nota && <p className="mt-1 max-w-md text-sm text-slate-400">{nota}</p>}
    </div>
  )
}
