import { STORAGE_KEYS, limpiarSesion } from './authStorage.js'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

export class ApiError extends Error {
  constructor(message, status, body) {
    super(message)
    this.status = status
    this.body = body
  }
}

// Preferir esto sobre `err instanceof ApiError` en componentes: con Vite/HMR,
// un módulo editado en caliente puede quedar duplicado en el grafo de módulos
// del navegador, y entonces `instanceof` compara contra una clase distinta a
// la que realmente lanzó el error — silenciosamente cae a un mensaje genérico
// aunque el error sí traiga un mensaje útil. Cualquier Error (ApiError, uno
// de red, uno de runtime) trae `.message`; solo hace falta el fallback.
export function mensajeDeError(err, fallback) {
  return err?.message || fallback
}

let refrescando = null

async function refrescarTokenSilencioso() {
  const refreshToken = localStorage.getItem(STORAGE_KEYS.refreshToken)
  if (!refreshToken) return false

  try {
    const res = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    if (!res.ok) return false
    const data = await res.json()
    localStorage.setItem(STORAGE_KEYS.accessToken, data.accessToken)
    return true
  } catch {
    return false
  }
}

async function request(path, { method = 'GET', body, sinAuth = false, sinEmpresa = false } = {}, _reintentado = false) {
  const headers = { 'Content-Type': 'application/json' }

  if (!sinAuth) {
    const token = localStorage.getItem(STORAGE_KEYS.accessToken)
    if (token) headers.Authorization = `Bearer ${token}`
  }
  if (!sinEmpresa) {
    const empresaId = localStorage.getItem(STORAGE_KEYS.empresaId)
    if (empresaId) headers['X-Empresa-Id'] = empresaId
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (res.status === 401 && !sinAuth && !_reintentado) {
    refrescando ||= refrescarTokenSilencioso().finally(() => {
      refrescando = null
    })
    const ok = await refrescando
    if (ok) return request(path, { method, body, sinAuth, sinEmpresa }, true)
    limpiarSesion()
  }

  const tieneJson = res.headers.get('content-type')?.includes('application/json')
  const data = tieneJson ? await res.json().catch(() => null) : null

  if (!res.ok) {
    throw new ApiError(data?.error || `Error ${res.status}`, res.status, data)
  }
  if (res.status === 204) return null
  return data
}

// Sube archivos con progreso real (fetch no expone eventos de progreso de
// subida en todos los navegadores) — usa XHR directamente, pero mantiene los
// mismos headers/convenciones (auth + X-Empresa-Id) que `request`.
function subirCarga({ tipoOrigen, archivos, onProgress }) {
  return new Promise((resolve, reject) => {
    const formData = new FormData()
    formData.append('tipoOrigen', tipoOrigen)
    archivos.forEach((archivo) => formData.append('archivos', archivo))

    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${API_URL}/api/cargas`)

    const token = localStorage.getItem(STORAGE_KEYS.accessToken)
    const empresaId = localStorage.getItem(STORAGE_KEYS.empresaId)
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    if (empresaId) xhr.setRequestHeader('X-Empresa-Id', empresaId)

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100))
    }

    xhr.onload = () => {
      let data = null
      try {
        data = JSON.parse(xhr.responseText)
      } catch {
        /* respuesta sin cuerpo JSON */
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data)
      } else {
        reject(new ApiError(data?.error || `Error ${xhr.status}`, xhr.status, data))
      }
    }
    xhr.onerror = () => reject(new ApiError('Error de red al subir los archivos', 0))

    xhr.send(formData)
  })
}

export const api = {
  subirCarga,

  registro: (datos) => request('/api/auth/registro', { method: 'POST', body: datos, sinAuth: true, sinEmpresa: true }),
  login: (datos) => request('/api/auth/login', { method: 'POST', body: datos, sinAuth: true, sinEmpresa: true }),
  refresh: (refreshToken) =>
    request('/api/auth/refresh', { method: 'POST', body: { refreshToken }, sinAuth: true, sinEmpresa: true }),
  logout: () => request('/api/auth/logout', { method: 'POST', sinEmpresa: true }),
  me: () => request('/api/auth/me', { sinEmpresa: true }),

  listarEmpresas: () => request('/api/empresas', { sinEmpresa: true }),
  crearEmpresa: (datos) => request('/api/empresas', { method: 'POST', body: datos, sinEmpresa: true }),
  obtenerEmpresa: (id) => request(`/api/empresas/${id}`, { sinEmpresa: true }),
  actualizarEmpresa: (id, datos) => request(`/api/empresas/${id}`, { method: 'PATCH', body: datos, sinEmpresa: true }),
  listarUsuariosEmpresa: (id) => request(`/api/empresas/${id}/usuarios`, { sinEmpresa: true }),
  invitarUsuario: (id, datos) =>
    request(`/api/empresas/${id}/usuarios`, { method: 'POST', body: datos, sinEmpresa: true }),
  actualizarMembresia: (id, usuarioId, datos) =>
    request(`/api/empresas/${id}/usuarios/${usuarioId}`, { method: 'PATCH', body: datos, sinEmpresa: true }),

  listarCargas: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return request(`/api/cargas${query ? `?${query}` : ''}`)
  },
  obtenerCarga: (id) => request(`/api/cargas/${id}`),
  listarArchivosDeCarga: (id) => request(`/api/cargas/${id}/archivos`),

  // Los endpoints de archivo requieren Authorization + X-Empresa-Id, así que no
  // pueden ser un <a href> plano: se piden como blob autenticado y se abren en pestaña.
  async abrirArchivo(path) {
    const token = localStorage.getItem(STORAGE_KEYS.accessToken)
    const empresaId = localStorage.getItem(STORAGE_KEYS.empresaId)
    const res = await fetch(`${API_URL}${path}`, {
      headers: { Authorization: `Bearer ${token}`, 'X-Empresa-Id': empresaId },
    })
    if (!res.ok) throw new ApiError('No se pudo abrir el archivo', res.status)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  },
  abrirArchivoOriginal(cargaId, archivoId) {
    return this.abrirArchivo(`/api/cargas/${cargaId}/archivos/${archivoId}/descarga`)
  },
  abrirArchivoOriginalDeDocumento(documentoId) {
    return this.abrirArchivo(`/api/documentos/${documentoId}/archivo-original`)
  },

  listarDocumentos: (params = {}) => {
    const limpios = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''))
    const query = new URLSearchParams(limpios).toString()
    return request(`/api/documentos${query ? `?${query}` : ''}`)
  },
  obtenerDocumento: (id) => request(`/api/documentos/${id}`),
  actualizarDocumento: (id, datos) => request(`/api/documentos/${id}`, { method: 'PATCH', body: datos }),
  revalidarDocumento: (id) => request(`/api/documentos/${id}/revalidar`, { method: 'POST' }),
  aprobarDocumento: (id) => request(`/api/documentos/${id}/aprobar`, { method: 'POST' }),
  rechazarDocumento: (id, motivo) => request(`/api/documentos/${id}/rechazar`, { method: 'POST', body: { motivo } }),
  obtenerResumenDocumentos: (params = {}) => {
    const limpios = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''))
    const query = new URLSearchParams(limpios).toString()
    return request(`/api/documentos/resumen${query ? `?${query}` : ''}`)
  },
}
