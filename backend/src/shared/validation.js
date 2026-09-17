export function esEmailValido(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function esTextoNoVacio(valor, { min = 1, max = Infinity } = {}) {
  return typeof valor === 'string' && valor.trim().length >= min && valor.trim().length <= max
}
