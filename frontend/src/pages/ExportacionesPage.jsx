import { useEffect, useState } from 'react'
import { Download, FileOutput } from 'lucide-react'
import { api, mensajeDeError } from '../lib/api.js'
import { useAuth } from '../context/AuthContext.jsx'

const CAMPO =
  'rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100'

// EXCEL/CSV (Fase 13) y WORDOFFICE, solo compras/ventas (Fase 14) tienen
// adaptador implementado. Siigo sigue bloqueado hasta que el usuario aporte
// sus propios insumos oficiales (ver docs/transformation-engine.md) — no se
// ofrece aquí para no dejar que alguien intente generar un archivo que el
// backend rechazará (501).
const SISTEMAS_DISPONIBLES = ['EXCEL', 'CSV', 'WORDOFFICE']
const TIPOS_INFORMACION = [
  { valor: 'COMPRAS', etiqueta: 'Compras' },
  { valor: 'VENTAS', etiqueta: 'Ventas' },
]

function primerDiaMesActual() {
  const hoy = new Date()
  return new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().slice(0, 10)
}

function hoyIso() {
  return new Date().toISOString().slice(0, 10)
}

export function ExportacionesPage() {
  const { empresaId, empresaActual } = useAuth()
  const puedeExportar = ['ADMINISTRADOR', 'CONTADOR'].includes(empresaActual?.rolCodigo)

  const [sistemas, setSistemas] = useState(null)
  const [historial, setHistorial] = useState(null)
  const [error, setError] = useState(null)

  const [form, setForm] = useState({
    sistemaDestino: 'EXCEL',
    tipoInformacion: 'COMPRAS',
    periodoInicio: primerDiaMesActual(),
    periodoFin: hoyIso(),
    parametrosAdaptador: { terceroInterno: '', notaLinea: '', centroCostosTexto: '' },
  })
  const [resumen, setResumen] = useState(null)
  const [previsualizando, setPrevisualizando] = useState(false)
  const [generando, setGenerando] = useState(false)

  useEffect(() => {
    api.listarSistemasDestino().then((res) => setSistemas(res.filter((s) => SISTEMAS_DISPONIBLES.includes(s.codigo))))
  }, [])

  function cargarHistorial() {
    api
      .listarExportaciones({ pageSize: 20 })
      .then((res) => setHistorial(res.data))
      .catch(() => setError('No se pudo cargar el historial de exportaciones'))
  }

  useEffect(cargarHistorial, [empresaId])

  function actualizarForm(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }))
    setResumen(null)
  }

  function actualizarParametroAdaptador(campo, valor) {
    setForm((f) => ({ ...f, parametrosAdaptador: { ...f.parametrosAdaptador, [campo]: valor } }))
    setResumen(null)
  }

  async function previsualizar() {
    setError(null)
    setPrevisualizando(true)
    try {
      setResumen(await api.previsualizarExportacion(form))
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo previsualizar la exportación'))
    } finally {
      setPrevisualizando(false)
    }
  }

  async function generar() {
    setError(null)
    setGenerando(true)
    try {
      await api.crearExportacion(form)
      setResumen(null)
      cargarHistorial()
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo generar la exportación'))
    } finally {
      setGenerando(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Exportaciones</h1>
        <p className="text-sm text-slate-500">Genera el archivo listo para importar en el sistema contable destino</p>
      </div>

      {error && <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">{error}</p>}

      {puedeExportar && (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-600">Nueva exportación</h2>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-xs text-slate-500">
              Sistema destino
              <select
                value={form.sistemaDestino}
                onChange={(e) => actualizarForm('sistemaDestino', e.target.value)}
                className={CAMPO}
              >
                {(sistemas || []).map((s) => (
                  <option key={s.codigo} value={s.codigo}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-500">
              Tipo de información
              <select
                value={form.tipoInformacion}
                onChange={(e) => actualizarForm('tipoInformacion', e.target.value)}
                className={CAMPO}
              >
                {TIPOS_INFORMACION.map((t) => (
                  <option key={t.valor} value={t.valor}>
                    {t.etiqueta}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-500">
              Desde
              <input
                type="date"
                value={form.periodoInicio}
                onChange={(e) => actualizarForm('periodoInicio', e.target.value)}
                className={CAMPO}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-500">
              Hasta
              <input
                type="date"
                value={form.periodoFin}
                onChange={(e) => actualizarForm('periodoFin', e.target.value)}
                className={CAMPO}
              />
            </label>
            <button
              type="button"
              onClick={previsualizar}
              disabled={previsualizando}
              className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-200 disabled:opacity-50"
            >
              Previsualizar
            </button>
          </div>

          {form.sistemaDestino === 'WORDOFFICE' && (
            <div className="mt-3 flex flex-wrap items-end gap-3 rounded-lg bg-slate-50 p-3">
              <label className="flex flex-col gap-1 text-xs text-slate-500">
                Tercero interno (WordOffice) *
                <input
                  value={form.parametrosAdaptador.terceroInterno}
                  onChange={(e) => actualizarParametroAdaptador('terceroInterno', e.target.value)}
                  placeholder="ej. 1019103885"
                  className={CAMPO}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-slate-500">
                Nota de línea (opcional)
                <input
                  value={form.parametrosAdaptador.notaLinea}
                  onChange={(e) => actualizarParametroAdaptador('notaLinea', e.target.value)}
                  className={CAMPO}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-slate-500">
                Centro de costos, texto (opcional)
                <input
                  value={form.parametrosAdaptador.centroCostosTexto}
                  onChange={(e) => actualizarParametroAdaptador('centroCostosTexto', e.target.value)}
                  className={CAMPO}
                />
              </label>
            </div>
          )}

          {resumen && (
            <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm">
              {resumen.sinCandidatos ? (
                <p className="text-slate-500">No hay documentos elegibles para este período y tipo de información.</p>
              ) : (
                <>
                  <p className="text-slate-700">
                    <span className="font-semibold text-emerald-600">✓ {resumen.listos}</span> documentos listos para exportar
                    {resumen.pendientes.length > 0 && (
                      <>
                        {' '}
                        · <span className="font-semibold text-amber-600">⚠ {resumen.pendientes.length}</span> pendientes (excluidos)
                      </>
                    )}
                  </p>
                  {resumen.pendientes.length > 0 && (
                    <ul className="mt-2 list-disc pl-5 text-xs text-slate-500">
                      {resumen.pendientes.map((p) => (
                        <li key={p.documentoId}>{p.errores.join('; ')}</li>
                      ))}
                    </ul>
                  )}
                  {resumen.listos > 0 && (
                    <button
                      type="button"
                      onClick={generar}
                      disabled={generando}
                      className="mt-3 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                    >
                      <FileOutput size={16} /> Generar archivo
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </section>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-600">Historial</h2>
        {historial === null ? (
          <p className="text-sm text-slate-400">Cargando…</p>
        ) : historial.length === 0 ? (
          <p className="text-sm text-slate-400">Todavía no se ha generado ninguna exportación.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-slate-400">
              <tr>
                <th className="pb-2">Fecha</th>
                <th className="pb-2">Destino</th>
                <th className="pb-2">Tipo</th>
                <th className="pb-2">Período</th>
                <th className="pb-2">Documentos</th>
                <th className="pb-2">Estado</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {historial.map((exp) => (
                <tr key={exp.id} className="border-t border-slate-100">
                  <td className="py-1.5 text-slate-600">{new Date(exp.creadoEn).toLocaleString('es-CO')}</td>
                  <td className="py-1.5 text-slate-600">{exp.sistemaDestino?.nombre}</td>
                  <td className="py-1.5 text-slate-600">{exp.tipoInformacion}</td>
                  <td className="py-1.5 text-slate-600">
                    {exp.periodoInicio.slice(0, 10)} — {exp.periodoFin.slice(0, 10)}
                  </td>
                  <td className="py-1.5 text-slate-600">{exp.cantidadDocumentos}</td>
                  <td className="py-1.5 text-slate-600">{exp.estado}</td>
                  <td className="py-1.5">
                    <button
                      type="button"
                      onClick={() => api.abrirArchivoExportacion(exp.id)}
                      className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-500"
                    >
                      <Download size={16} /> Descargar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
