import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { api } from '../lib/api.js'
import { STORAGE_KEYS, limpiarSesion } from '../lib/authStorage.js'

const AuthContext = createContext(null)

function leerJSON(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => leerJSON(STORAGE_KEYS.usuario))
  const [empresaId, setEmpresaId] = useState(() => localStorage.getItem(STORAGE_KEYS.empresaId))
  const [cargando, setCargando] = useState(false)

  const guardarSesion = useCallback((resultado) => {
    localStorage.setItem(STORAGE_KEYS.accessToken, resultado.accessToken)
    localStorage.setItem(STORAGE_KEYS.refreshToken, resultado.refreshToken)
    localStorage.setItem(STORAGE_KEYS.usuario, JSON.stringify(resultado.usuario))
    setUsuario(resultado.usuario)

    const empresaGuardada = localStorage.getItem(STORAGE_KEYS.empresaId)
    const sigueValida = resultado.usuario.empresas.some((e) => e.empresaId === empresaGuardada)
    const empresaElegida = sigueValida ? empresaGuardada : resultado.usuario.empresas[0]?.empresaId

    if (empresaElegida) {
      localStorage.setItem(STORAGE_KEYS.empresaId, empresaElegida)
      setEmpresaId(empresaElegida)
    }
  }, [])

  const login = useCallback(
    async (email, password) => {
      setCargando(true)
      try {
        guardarSesion(await api.login({ email, password }))
      } finally {
        setCargando(false)
      }
    },
    [guardarSesion],
  )

  const registrar = useCallback(
    async (datos) => {
      setCargando(true)
      try {
        guardarSesion(await api.registro(datos))
      } finally {
        setCargando(false)
      }
    },
    [guardarSesion],
  )

  // Tras crear una empresa o cambiar de rol, el access token vigente queda
  // desactualizado (las empresas/roles viajan embebidos en el JWT desde el
  // login) — se refresca para reflejar el cambio sin pedir credenciales otra vez.
  const refrescarPerfil = useCallback(async () => {
    const refreshToken = localStorage.getItem(STORAGE_KEYS.refreshToken)
    if (!refreshToken) return
    await api.refresh(refreshToken)
    const perfil = await api.me()
    const actual = leerJSON(STORAGE_KEYS.usuario) || {}
    const actualizado = { ...actual, ...perfil }
    localStorage.setItem(STORAGE_KEYS.usuario, JSON.stringify(actualizado))
    setUsuario(actualizado)
  }, [])

  const cambiarEmpresa = useCallback((nuevoEmpresaId) => {
    localStorage.setItem(STORAGE_KEYS.empresaId, nuevoEmpresaId)
    setEmpresaId(nuevoEmpresaId)
  }, [])

  const logout = useCallback(() => {
    limpiarSesion()
    setUsuario(null)
    setEmpresaId(null)
  }, [])

  const empresaActual = useMemo(
    () => usuario?.empresas?.find((e) => e.empresaId === empresaId) || null,
    [usuario, empresaId],
  )

  const value = useMemo(
    () => ({
      usuario,
      empresaId,
      empresaActual,
      cargando,
      autenticado: Boolean(usuario),
      login,
      registrar,
      logout,
      cambiarEmpresa,
      refrescarPerfil,
    }),
    [usuario, empresaId, empresaActual, cargando, login, registrar, logout, cambiarEmpresa, refrescarPerfil],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
