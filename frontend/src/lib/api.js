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

// Arma un query string omitiendo valores undefined/vacíos (filtros sin usar).
function queryDesde(params) {
  const limpios = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''))
  const query = new URLSearchParams(limpios).toString()
  return query ? `?${query}` : ''
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

// Sube el archivo de extracto (CSV/XLSX, plantilla propia de ContaAssist) —
// mismo criterio de headers que subirCarga, sin progreso porque un extracto
// es un archivo chico (no requiere feedback de avance).
async function subirExtracto(cuentaId, archivo) {
  const formData = new FormData()
  formData.append('archivo', archivo)

  const token = localStorage.getItem(STORAGE_KEYS.accessToken)
  const empresaId = localStorage.getItem(STORAGE_KEYS.empresaId)
  const res = await fetch(`${API_URL}/api/bancos/cuentas/${cuentaId}/extractos`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(empresaId ? { 'X-Empresa-Id': empresaId } : {}),
    },
    body: formData,
  })
  const tieneJson = res.headers.get('content-type')?.includes('application/json')
  const data = tieneJson ? await res.json().catch(() => null) : null
  if (!res.ok) throw new ApiError(data?.error || `Error ${res.status}`, res.status, data)
  return data
}

export const api = {
  subirCarga,
  subirExtracto,

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

  listarDocumentos: (params = {}) => request(`/api/documentos${queryDesde(params)}`),
  obtenerDocumento: (id) => request(`/api/documentos/${id}`),
  actualizarDocumento: (id, datos) => request(`/api/documentos/${id}`, { method: 'PATCH', body: datos }),
  revalidarDocumento: (id) => request(`/api/documentos/${id}/revalidar`, { method: 'POST' }),
  aprobarDocumento: (id) => request(`/api/documentos/${id}/aprobar`, { method: 'POST' }),
  rechazarDocumento: (id, motivo) => request(`/api/documentos/${id}/rechazar`, { method: 'POST', body: { motivo } }),
  obtenerResumenDocumentos: (params = {}) => request(`/api/documentos/resumen${queryDesde(params)}`),

  listarTerceros: (params = {}) => request(`/api/terceros${queryDesde(params)}`),
  obtenerTercero: (id) => request(`/api/terceros/${id}`),
  crearTercero: (datos) => request('/api/terceros', { method: 'POST', body: datos }),
  actualizarTercero: (id, datos) => request(`/api/terceros/${id}`, { method: 'PATCH', body: datos }),

  listarCuentasContables: () => request('/api/config/cuentas-contables'),
  crearCuentaContable: (datos) => request('/api/config/cuentas-contables', { method: 'POST', body: datos }),
  listarCentrosCosto: () => request('/api/config/centros-costo'),
  crearCentroCosto: (datos) => request('/api/config/centros-costo', { method: 'POST', body: datos }),
  listarFormasPago: () => request('/api/config/formas-pago'),
  crearFormaPago: (datos) => request('/api/config/formas-pago', { method: 'POST', body: datos }),
  listarSistemasDestino: () => request('/api/config/sistemas-destino'),

  listarMapeoCuentas: (sistemaDestino) => request(`/api/mapeos/cuentas${queryDesde({ sistemaDestino })}`),
  guardarMapeoCuenta: (datos) => request('/api/mapeos/cuentas', { method: 'POST', body: datos }),
  listarMapeoFormasPago: (sistemaDestino) => request(`/api/mapeos/formas-pago${queryDesde({ sistemaDestino })}`),
  guardarMapeoFormaPago: (datos) => request('/api/mapeos/formas-pago', { method: 'POST', body: datos }),
  listarMapeoTerceros: (sistemaDestino) => request(`/api/mapeos/terceros${queryDesde({ sistemaDestino })}`),
  guardarMapeoTercero: (datos) => request('/api/mapeos/terceros', { method: 'POST', body: datos }),
  listarMapeoBodegas: (sistemaDestino) => request(`/api/mapeos/bodegas${queryDesde({ sistemaDestino })}`),
  guardarMapeoBodega: (datos) => request('/api/mapeos/bodegas', { method: 'POST', body: datos }),
  listarMapeoProductos: (sistemaDestino) => request(`/api/mapeos/productos${queryDesde({ sistemaDestino })}`),
  guardarMapeoProducto: (datos) => request('/api/mapeos/productos', { method: 'POST', body: datos }),

  listarProductos: (params = {}) => request(`/api/inventario/productos${queryDesde(params)}`),
  crearProducto: (datos) => request('/api/inventario/productos', { method: 'POST', body: datos }),
  listarBodegas: () => request('/api/inventario/bodegas'),
  crearBodega: (datos) => request('/api/inventario/bodegas', { method: 'POST', body: datos }),

  actualizarDetalleDocumento: (documentoId, detalleId, datos) =>
    request(`/api/documentos/${documentoId}/detalles/${detalleId}`, { method: 'PATCH', body: datos }),

  previsualizarExportacion: (datos) => request('/api/exportaciones/preview', { method: 'POST', body: datos }),
  crearExportacion: (datos) => request('/api/exportaciones', { method: 'POST', body: datos }),
  listarExportaciones: (params = {}) => request(`/api/exportaciones${queryDesde(params)}`),
  obtenerExportacion: (id) => request(`/api/exportaciones/${id}`),
  async abrirArchivoExportacion(id) {
    return this.abrirArchivo(`/api/exportaciones/${id}/descargar`)
  },

  listarDocumentosConSaldo: (params = {}) => request(`/api/pagos/documentos${queryDesde(params)}`),
  obtenerResumenCartera: (params = {}) => request(`/api/pagos/resumen${queryDesde(params)}`),
  registrarPago: (datos) => request('/api/pagos', { method: 'POST', body: datos }),
  listarPagos: (params = {}) => request(`/api/pagos${queryDesde(params)}`),
  obtenerPago: (id) => request(`/api/pagos/${id}`),
  anularPago: (id) => request(`/api/pagos/${id}/anular`, { method: 'POST' }),

  listarCuentasBancarias: () => request('/api/bancos/cuentas'),
  crearCuentaBancaria: (datos) => request('/api/bancos/cuentas', { method: 'POST', body: datos }),
  listarExtractosDeCuenta: (cuentaId) => request(`/api/bancos/cuentas/${cuentaId}/extractos`),
  obtenerExtracto: (id) => request(`/api/bancos/extractos/${id}`),
  conciliarLinea: (lineaId, pagoId) =>
    request(`/api/bancos/extractos/lineas/${lineaId}/conciliar`, { method: 'POST', body: { pagoId } }),
  desconciliarLinea: (lineaId) => request(`/api/bancos/extractos/lineas/${lineaId}/desconciliar`, { method: 'POST' }),
}
