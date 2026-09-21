import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, mensajeDeError } from '../lib/api.js'
import { useAuth } from '../context/AuthContext.jsx'
import { TablaCatalogo } from '../components/configuracion/TablaCatalogo.jsx'
import { formatearMoneda, formatearFecha } from '../lib/formato.js'

const CAMPO = 'rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100'

// Fase 15: catálogo de cuentas bancarias + vínculo con Pago/Recaudo
// (ModalRegistrarPago.jsx) + importación de extractos (plantilla propia de
// ContaAssist) + conciliación (ExtractoDetallePage.jsx).
export function BancosPage() {
  const { empresaId, empresaActual } = useAuth()
  const [cuentas, setCuentas] = useState(null)

  const puedeEditar = ['ADMINISTRADOR', 'AUXILIAR_CONTABLE', 'CONTADOR'].includes(empresaActual?.rolCodigo)

  function cargarCuentas() {
    api.listarCuentasBancarias().then(setCuentas)
  }

  useEffect(cargarCuentas, [empresaId])

  const filas = cuentas?.map((c) => ({
    ...c,
    saldoInicial: formatearMoneda(c.saldoInicial),
    saldo: formatearMoneda(c.saldo),
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Bancos</h1>
        <p className="text-sm text-slate-500">
          Cuentas bancarias de la empresa. El saldo se calcula a partir del saldo inicial más los pagos/recaudos
          registrados en Cartera/Cuentas por pagar que se asociaron a cada cuenta.
        </p>
      </div>

      <TablaCatalogo
        titulo="Cuentas bancarias"
        columnas={[
          { campo: 'banco', etiqueta: 'Banco' },
          { campo: 'numeroCuenta', etiqueta: 'Número' },
          { campo: 'tipoCuenta', etiqueta: 'Tipo' },
          { campo: 'saldoInicial', etiqueta: 'Saldo inicial' },
          { campo: 'saldo', etiqueta: 'Saldo actual' },
        ]}
        filas={filas ?? null}
        puedeEditar={puedeEditar}
        valoresIniciales={{ banco: '', numeroCuenta: '', tipoCuenta: 'AHORROS', saldoInicial: '0' }}
        camposFormulario={[
          { nombre: 'banco', etiqueta: 'Banco' },
          { nombre: 'numeroCuenta', etiqueta: 'Número de cuenta' },
          { nombre: 'tipoCuenta', etiqueta: 'Tipo', opciones: ['AHORROS', 'CORRIENTE'] },
          { nombre: 'saldoInicial', etiqueta: 'Saldo inicial' },
        ]}
        onCrear={async (form) => {
          await api.crearCuentaBancaria({ ...form, saldoInicial: Number(form.saldoInicial) || 0 })
          cargarCuentas()
        }}
      />

      {cuentas?.length > 0 && puedeEditar && <SeccionExtractos cuentas={cuentas} />}
    </div>
  )
}

function SeccionExtractos({ cuentas }) {
  const [cuentaId, setCuentaId] = useState(cuentas[0]?.id || '')
  const [extractos, setExtractos] = useState(null)
  const [archivo, setArchivo] = useState(null)
  const [error, setError] = useState(null)
  const [subiendo, setSubiendo] = useState(false)
  const [resultado, setResultado] = useState(null)

  function cargarExtractos(id) {
    if (!id) return
    setExtractos(null)
    api.listarExtractosDeCuenta(id).then(setExtractos).catch(() => setError('No se pudieron cargar los extractos'))
  }

  useEffect(() => cargarExtractos(cuentaId), [cuentaId])

  async function handleImportar(e) {
    e.preventDefault()
    if (!archivo || !cuentaId) return
    setError(null)
    setResultado(null)
    setSubiendo(true)
    try {
      const res = await api.subirExtracto(cuentaId, archivo)
      setResultado(res)
      setArchivo(null)
      cargarExtractos(cuentaId)
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo importar el extracto'))
    } finally {
      setSubiendo(false)
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="mb-1 text-sm font-semibold text-slate-600">Extractos bancarios</h2>
      <p className="mb-3 text-xs text-slate-400">
        Plantilla propia de ContaAssist (no es el formato de ningún banco): columnas <code>fecha</code>,{' '}
        <code>descripcion</code>, <code>debito</code>, <code>credito</code> (CSV o XLSX).
      </p>

      {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <form onSubmit={handleImportar} className="mb-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-slate-500">
          Cuenta
          <select value={cuentaId} onChange={(e) => setCuentaId(e.target.value)} className={CAMPO}>
            {cuentas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.banco} — {c.numeroCuenta}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500">
          Archivo (CSV/XLSX)
          <input
            type="file"
            accept=".csv,.xlsx"
            onChange={(e) => setArchivo(e.target.files?.[0] || null)}
            className={CAMPO}
          />
        </label>
        <button
          type="submit"
          disabled={subiendo || !archivo}
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {subiendo ? 'Importando…' : 'Importar'}
        </button>
      </form>

      {resultado && (
        <div className="mb-4 rounded-lg bg-slate-50 p-3 text-sm">
          <p className="text-slate-700">{resultado.extracto.cantidadLineas} líneas importadas correctamente.</p>
          {resultado.erroresFilas.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-xs text-red-600">
              {resultado.erroresFilas.map((f) => (
                <li key={f.fila}>
                  fila {f.fila}: {f.errores.join('; ')}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {extractos === null ? (
        <p className="text-sm text-slate-400">Cargando…</p>
      ) : extractos.length === 0 ? (
        <p className="text-sm text-slate-400">Todavía no se ha importado ningún extracto para esta cuenta.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-xs text-slate-400">
              <th className="py-1.5 pr-4 font-medium">Importado</th>
              <th className="py-1.5 pr-4 font-medium">Período</th>
              <th className="py-1.5 pr-4 font-medium">Líneas</th>
              <th className="py-1.5" />
            </tr>
          </thead>
          <tbody>
            {extractos.map((ex) => (
              <tr key={ex.id} className="border-b border-slate-50 last:border-0">
                <td className="py-1.5 pr-4 text-slate-500">{formatearFecha(ex.creadoEn)}</td>
                <td className="py-1.5 pr-4 text-slate-600">
                  {formatearFecha(ex.periodoInicio)} — {formatearFecha(ex.periodoFin)}
                </td>
                <td className="py-1.5 pr-4 text-slate-600">{ex.cantidadLineas}</td>
                <td className="py-1.5">
                  <Link to={`/bancos/extractos/${ex.id}`} className="text-xs font-medium text-indigo-600 hover:text-indigo-500">
                    Ver / conciliar
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
