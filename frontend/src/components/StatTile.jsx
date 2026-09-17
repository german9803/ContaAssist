export function StatTile({ label, value, nota }) {
  const disponible = value !== null && value !== undefined

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${disponible ? 'text-slate-800' : 'text-slate-300'}`}>
        {disponible ? value : '—'}
      </p>
      {nota && <p className="mt-1 text-xs text-slate-400">{nota}</p>}
    </div>
  )
}
