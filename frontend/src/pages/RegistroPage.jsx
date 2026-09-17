import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FileStack } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { mensajeDeError } from '../lib/api.js'

const CAMPO_INICIAL = {
  nombreCompleto: '',
  email: '',
  password: '',
  empresaRazonSocial: '',
  empresaNit: '',
}

export function RegistroPage() {
  const { registrar, cargando } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState(CAMPO_INICIAL)
  const [error, setError] = useState(null)

  function actualizarCampo(campo) {
    return (e) => setForm((f) => ({ ...f, [campo]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    try {
      await registrar(form)
      navigate('/', { replace: true })
    } catch (err) {
      setError(mensajeDeError(err, 'No fue posible completar el registro'))
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2 text-indigo-600">
          <FileStack size={36} strokeWidth={1.75} />
          <h1 className="text-2xl font-semibold text-slate-800">Crea tu empresa en ContaAssist</h1>
          <p className="text-center text-sm text-slate-500">Quedarás como administrador de esta empresa</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          {error && (
            <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          <Campo label="Tu nombre completo" id="nombreCompleto" value={form.nombreCompleto} onChange={actualizarCampo('nombreCompleto')} />
          <Campo label="Email" id="email" type="email" autoComplete="email" value={form.email} onChange={actualizarCampo('email')} />
          <Campo
            label="Contraseña (mínimo 8 caracteres)"
            id="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={form.password}
            onChange={actualizarCampo('password')}
          />
          <Campo label="Razón social de la empresa" id="empresaRazonSocial" value={form.empresaRazonSocial} onChange={actualizarCampo('empresaRazonSocial')} />
          <Campo label="NIT de la empresa" id="empresaNit" value={form.empresaNit} onChange={actualizarCampo('empresaNit')} className="mb-6" />

          <button
            type="submit"
            disabled={cargando}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-60"
          >
            {cargando ? 'Creando…' : 'Crear cuenta y empresa'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  )
}

function Campo({ label, id, className = 'mb-4', ...props }) {
  return (
    <div className={className}>
      <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        required
        {...props}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
      />
    </div>
  )
}
