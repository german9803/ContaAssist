import { useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import { api, mensajeDeError } from '../lib/api.js'
import { useAuth } from '../context/AuthContext.jsx'

const CAMPO = 'rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100'

function FilaMapeo({ codigo, nombre, codigoDestino, disabled, onGuardar }) {
  const [valor, setValor] = useState(codigoDestino || '')
  const [guardando, setGuardando] = useState(false)

  async function guardar() {
    setGuardando(true)
    try {
      await onGuardar(valor)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <tr className="border-b border-slate-50 last:border-0">
      <td className="py-1.5 pr-4 text-slate-600">
        {codigo} — {nombre}
      </td>
      <td className="py-1.5 pr-2">
        <input value={valor} onChange={(e) => setValor(e.target.value)} disabled={disabled} className={`${CAMPO} w-40`} />
      </td>
      <td className="py-1.5">
        {!disabled && (
          <button type="button" onClick={guardar} disabled={guardando} className="text-indigo-600 hover:text-indigo-500">
            <Save size={16} />
          </button>
        )}
      </td>
    </tr>
  )
}

export function MapeoPage() {
  const { empresaId, empresaActual } = useAuth()
  const puedeEditar = ['ADMINISTRADOR', 'AUXILIAR_CONTABLE', 'CONTADOR'].includes(empresaActual?.rolCodigo)

  const [sistemas, setSistemas] = useState(null)
  const [sistemaDestino, setSistemaDestino] = useState('')
  const [cuentas, setCuentas] = useState(null)
  const [formasPago, setFormasPago] = useState(null)
  const [terceros, setTerceros] = useState(null)
  const [error, setError] = useState(null)

  const [buscarTercero, setBuscarTercero] = useState('')
  const [resultadosTercero, setResultadosTercero] = useState([])

  useEffect(() => {
    api.listarSistemasDestino().then((res) => {
      setSistemas(res)
      if (res.length > 0) setSistemaDestino(res[0].codigo)
    })
  }, [])

  function cargar() {
    if (!sistemaDestino) return
    setError(null)
    api.listarMapeoCuentas(sistemaDestino).then(setCuentas).catch(() => setError('No se pudo cargar el mapeo de cuentas'))
    api.listarMapeoFormasPago(sistemaDestino).then(setFormasPago).catch(() => setError('No se pudo cargar el mapeo de formas de pago'))
    api.listarMapeoTerceros(sistemaDestino).then(setTerceros).catch(() => setError('No se pudo cargar el mapeo de terceros'))
  }

  useEffect(cargar, [empresaId, sistemaDestino])

  async function buscarTerceros() {
    if (!buscarTercero.trim()) return
    const res = await api.listarTerceros({ q: buscarTercero, pageSize: 5 })
    setResultadosTercero(res.data)
  }

  async function mapearTercero(tercero, codigoDestino) {
    if (!codigoDestino?.trim()) return
    try {
      await api.guardarMapeoTercero({ sistemaDestino, terceroId: tercero.id, codigoDestino })
      setResultadosTercero([])
      setBuscarTercero('')
      cargar()
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo guardar el mapeo'))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Mapeo de datos</h1>
          <p className="text-sm text-slate-500">Equivalencias entre los catálogos internos y el sistema destino</p>
        </div>
        <select value={sistemaDestino} onChange={(e) => setSistemaDestino(e.target.value)} className={CAMPO}>
          {sistemas?.map((s) => (
            <option key={s.codigo} value={s.codigo}>
              {s.nombre}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">{error}</p>}

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-600">Cuentas contables</h2>
        {cuentas === null ? (
          <p className="text-sm text-slate-400">Cargando…</p>
        ) : cuentas.length === 0 ? (
          <p className="text-sm text-slate-400">No hay cuentas contables creadas (Configuración → Catálogos contables).</p>
        ) : (
          <table className="w-full text-left text-sm">
            <tbody>
              {cuentas.map((c) => (
                <FilaMapeo
                  key={c.cuentaContableId}
                  codigo={c.codigo}
                  nombre={c.nombre}
                  codigoDestino={c.codigoDestino}
                  disabled={!puedeEditar}
                  onGuardar={(codigoDestino) =>
                    api.guardarMapeoCuenta({ sistemaDestino, cuentaContableId: c.cuentaContableId, codigoDestino }).then(cargar)
                  }
                />
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-600">Formas de pago</h2>
        {formasPago === null ? (
          <p className="text-sm text-slate-400">Cargando…</p>
        ) : formasPago.length === 0 ? (
          <p className="text-sm text-slate-400">No hay formas de pago creadas (Configuración → Catálogos contables).</p>
        ) : (
          <table className="w-full text-left text-sm">
            <tbody>
              {formasPago.map((f) => (
                <FilaMapeo
                  key={f.formaPagoId}
                  codigo={f.codigo}
                  nombre={f.nombre}
                  codigoDestino={f.codigoDestino}
                  disabled={!puedeEditar}
                  onGuardar={(codigoDestino) =>
                    api.guardarMapeoFormaPago({ sistemaDestino, formaPagoId: f.formaPagoId, codigoDestino }).then(cargar)
                  }
                />
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-600">Terceros</h2>

        {terceros === null ? (
          <p className="text-sm text-slate-400">Cargando…</p>
        ) : terceros.length === 0 ? (
          <p className="mb-4 text-sm text-slate-400">Todavía no hay terceros mapeados para este sistema.</p>
        ) : (
          <table className="mb-4 w-full text-left text-sm">
            <tbody>
              {terceros.map((t) => (
                <FilaMapeo
                  key={t.terceroId}
                  codigo={t.identificacion}
                  nombre={t.razonSocial}
                  codigoDestino={t.codigoDestino}
                  disabled={!puedeEditar}
                  onGuardar={(codigoDestino) => api.guardarMapeoTercero({ sistemaDestino, terceroId: t.terceroId, codigoDestino }).then(cargar)}
                />
              ))}
            </tbody>
          </table>
        )}

        {puedeEditar && (
          <div>
            <div className="flex gap-2">
              <input
                placeholder="Buscar tercero por nombre o NIT"
                value={buscarTercero}
                onChange={(e) => setBuscarTercero(e.target.value)}
                className={`${CAMPO} w-64`}
              />
              <button type="button" onClick={buscarTerceros} className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-200">
                Buscar
              </button>
            </div>
            {resultadosTercero.length > 0 && (
              <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200">
                {resultadosTercero.map((t) => (
                  <FilaBusquedaTercero key={t.id} tercero={t} onMapear={mapearTercero} />
                ))}
              </ul>
            )}
          </div>
        )}
      </section>
    </div>
  )
}

function FilaBusquedaTercero({ tercero, onMapear }) {
  const [codigoDestino, setCodigoDestino] = useState('')
  return (
    <li className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
      <span className="text-slate-600">
        {tercero.identificacion} — {tercero.razonSocial}
      </span>
      <span className="flex items-center gap-2">
        <input
          placeholder="Código destino"
          value={codigoDestino}
          onChange={(e) => setCodigoDestino(e.target.value)}
          className={`${CAMPO} w-32`}
        />
        <button
          type="button"
          onClick={() => onMapear(tercero, codigoDestino)}
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500"
        >
          Mapear
        </button>
      </span>
    </li>
  )
}
