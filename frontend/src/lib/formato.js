export function formatearMoneda(valor) {
  if (valor === null || valor === undefined) return '—'
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(valor)
}

export function formatearFecha(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-CO', { dateStyle: 'medium' })
}
