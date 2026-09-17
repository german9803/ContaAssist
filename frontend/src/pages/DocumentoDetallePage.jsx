import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ExternalLink, RefreshCw } from 'lucide-react'
import { api, mensajeDeError } from '../lib/api.js'
import { useAuth } from '../context/AuthContext.jsx'
import { TIPOS_DOCUMENTO } from '../lib/tiposDocumento.js'
import { EstadoBadge } from '../components/carga/EstadoBadge.jsx'
import { ListaValidaciones } from '../components/documentos/ListaValidaciones.jsx'

const ROLES_QUE_APRUEBAN = ['ADMINISTRADOR', 'CONTADOR']
const ESTADOS_TERMINALES = ['APROBADO', 'RECHAZADO']

const CAMPOS_INICIALES = {
  tipoDocumento: '',
  numeroDocumento: '',
  prefijo: '',
  fechaEmision: '',
  subtotal: '',
  total: '',
  observaciones: '',
  terceroNit: '',
  terceroRazonSocial: '',
}

function aFormulario(doc) {
  return {
    tipoDocumento: doc.tipoDocumento || '',
    numeroDocumento: doc.numeroDocumento || '',
    prefijo: doc.prefijo || '',
    fechaEmision: doc.fechaEmision ? doc.fechaEmision.slice(0, 10) : '',
    subtotal: doc.subtotal ?? '',
    total: doc.total ?? '',
    observaciones: doc.observaciones || '',
    terceroNit: doc.tercero?.identificacion || '',
    terceroRazonSocial: doc.tercero?.razonSocial || '',
  }
}

export function DocumentoDetallePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { empresaActual } = useAuth()
  const [documento, setDocumento] = useState(null)
  const [form, setForm] = useState(CAMPOS_INICIALES)
  const [error, setError] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState(false)
  const [procesandoAccion, setProcesandoAccion] = useState(false)

  const puedeAprobar = ROLES_QUE_APRUEBAN.includes(empresaActual?.rolCodigo)
  const esTerminal = ESTADOS_TERMINALES.includes(documento?.estado)

  useEffect(() => {
    api
      .obtenerDocumento(id)
      .then((doc) => {
        setDocumento(doc)
        setForm(aFormulario(doc))
      })
      .catch(() => setError('No se pudo cargar el documento'))
  }, [id])

  function actualizarCampo(campo) {
    return (e) => {
      setForm((f) => ({ ...f, [campo]: e.target.value }))
      setGuardado(false)
    }
  }

  async function handleGuardar(e) {
    e.preventDefault()
    setError(null)
    setGuardando(true)
    try {
      const doc = await api.actualizarDocumento(id, {
        tipoDocumento: form.tipoDocumento,
        numeroDocumento: form.numeroDocumento || null,
        prefijo: form.prefijo || null,
        fechaEmision: form.fechaEmision || null,
        subtotal: form.subtotal === '' ? null : Number(form.subtotal),
        total: form.total === '' ? null : Number(form.total),
        observaciones: form.observaciones || null,
        ...(form.terceroNit ? { terceroNit: form.terceroNit, terceroRazonSocial: form.terceroRazonSocial } : {}),
      })
      setDocumento(doc)
      setForm(aFormulario(doc))
      setGuardado(true)
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo guardar el documento'))
    } finally {
      setGuardando(false)
    }
  }

  async function ejecutarAccion(accion) {
    setError(null)
    setProcesandoAccion(true)
    try {
      const doc = await accion()
      setDocumento(doc)
      setForm(aFormulario(doc))
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo completar la acción'))
    } finally {
      setProcesandoAccion(false)
    }
  }

  const handleRevalidar = () => ejecutarAccion(() => api.revalidarDocumento(id))
  const handleAprobar = () => ejecutarAccion(() => api.aprobarDocumento(id))
  const handleRechazar = () => {
    const motivo = window.prompt('Motivo del rechazo (opcional):') || undefined
    return ejecutarAccion(() => api.rechazarDocumento(id, motivo))
  }

  if (error && !documento) {
    return <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">{error}</p>
  }
  if (!documento) return <p className="text-sm text-slate-400">Cargando…</p>

  return (
    <div className="space-y-4">
      <Link to="/documentos" className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft size={15} /> Volver a documentos
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-800">
          {documento.tipoDocumento} {documento.numeroDocumento ? `· ${documento.numeroDocumento}` : ''}
        </h1>
        <div className="flex items-center gap-2">
          <EstadoBadge estado={documento.estado} />
          <button
            type="button"
            onClick={handleRevalidar}
            disabled={procesandoAccion}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw size={13} /> Revalidar
          </button>
          {puedeAprobar && !esTerminal && (
            <>
              <button
                type="button"
                onClick={handleRechazar}
                disabled={procesandoAccion}
                className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
              >
                Rechazar
              </button>
              <button
                type="button"
                onClick={handleAprobar}
                disabled={procesandoAccion || documento.hayBloqueante}
                title={documento.hayBloqueante ? 'Hay errores bloqueantes sin resolver' : undefined}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
              >
                Aprobar
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-600">Documento original</h2>
          {documento.archivoOrigenId ? (
            <button
              type="button"
              onClick={() => api.abrirArchivoOriginalDeDocumento(documento.id).catch(() => setError('No se pudo abrir el archivo'))}
              className="mb-3 flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-500"
            >
              Abrir archivo original <ExternalLink size={14} />
            </button>
          ) : (
            <p className="mb-3 text-sm text-slate-400">Este documento no tiene un archivo de origen asociado.</p>
          )}

          {documento.textoExtraido ? (
            <pre className="mb-4 max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
              {documento.textoExtraido}
            </pre>
          ) : (
            <p className="mb-4 text-xs text-slate-400">Sin texto extraído para este documento.</p>
          )}

          <h2 className="mb-3 text-sm font-semibold text-slate-600">Validaciones</h2>
          <ListaValidaciones validaciones={documento.validaciones} />
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-600">Datos extraídos</h2>
          {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          {guardado && <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Guardado.</p>}

          <form onSubmit={handleGuardar} className="grid grid-cols-2 gap-3">
            <Campo label="Tipo" className="col-span-2">
              <select
                value={form.tipoDocumento}
                onChange={actualizarCampo('tipoDocumento')}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              >
                {TIPOS_DOCUMENTO.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Campo>

            <Campo label="Número">
              <Input value={form.numeroDocumento} onChange={actualizarCampo('numeroDocumento')} />
            </Campo>
            <Campo label="Prefijo">
              <Input value={form.prefijo} onChange={actualizarCampo('prefijo')} />
            </Campo>
            <Campo label="Fecha de emisión" className="col-span-2">
              <Input type="date" value={form.fechaEmision} onChange={actualizarCampo('fechaEmision')} />
            </Campo>

            <Campo label="NIT tercero">
              <Input value={form.terceroNit} onChange={actualizarCampo('terceroNit')} />
            </Campo>
            <Campo label="Razón social tercero">
              <Input value={form.terceroRazonSocial} onChange={actualizarCampo('terceroRazonSocial')} />
            </Campo>

            <Campo label="Subtotal">
              <Input type="number" step="0.01" value={form.subtotal} onChange={actualizarCampo('subtotal')} />
            </Campo>
            <Campo label="Total">
              <Input type="number" step="0.01" value={form.total} onChange={actualizarCampo('total')} />
            </Campo>

            {documento.impuestos?.length > 0 && (
              <div className="col-span-2 rounded-lg bg-slate-50 p-2 text-xs text-slate-500">
                Impuestos: {documento.impuestos.map((i) => `${i.codigo} (${i.valor})`).join(', ')}
              </div>
            )}

            <Campo label="Observaciones" className="col-span-2">
              <textarea
                value={form.observaciones}
                onChange={actualizarCampo('observaciones')}
                rows={3}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </Campo>

            <div className="col-span-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => navigate('/documentos')}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardando}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
              >
                {guardando ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  )
}

function Campo({ label, className = '', children }) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-medium text-slate-500">{label}</label>
      {children}
    </div>
  )
}

function Input(props) {
  return (
    <input
      {...props}
      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
    />
  )
}
