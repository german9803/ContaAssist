export const STORAGE_KEYS = {
  accessToken: 'contaassist.accessToken',
  refreshToken: 'contaassist.refreshToken',
  usuario: 'contaassist.usuario',
  empresaId: 'contaassist.empresaId',
}

export function limpiarSesion() {
  Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key))
}
