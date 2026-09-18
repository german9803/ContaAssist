import { TIPOS_DOCUMENTO } from '../../lib/tiposDocumento.js'
import { ESTADOS_DOCUMENTO_FILTRABLES } from '../../lib/estadosDocumento.js'

const CAMPO = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100'

export function FiltrosDocumentos({ valores, onChange, mostrarTipo = true }) {
  function campo(nombre) {
    return (e) => onChange({ ...valores, [nombre]: e.target.value })
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {mostrarTipo && (
        <select value={valores.tipoDocumento || ''} onChange={campo('tipoDocumento')} className={CAMPO}>
          <option value="">Todos los tipos</option>
          {TIPOS_DOCUMENTO.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      )}

      <select value={valores.estado || ''} onChange={campo('estado')} className={CAMPO}>
        <option value="">Todos los estados</option>
        {ESTADOS_DOCUMENTO_FILTRABLES.map((e) => (
          <option key={e} value={e}>
            {e}
          </option>
        ))}
      </select>

      <input
        type="text"
        placeholder="Tercero (nombre o NIT)"
        value={valores.tercero || ''}
        onChange={campo('tercero')}
        className={CAMPO}
      />

      <input
        type="date"
        aria-label="Desde"
        value={valores.fechaDesde || ''}
        onChange={campo('fechaDesde')}
        className={CAMPO}
      />
      <input
        type="date"
        aria-label="Hasta"
        value={valores.fechaHasta || ''}
        onChange={campo('fechaHasta')}
        className={CAMPO}
      />
    </div>
  )
}
