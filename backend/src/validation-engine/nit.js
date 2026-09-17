// Dígito de verificación del NIT colombiano — algoritmo público de la DIAN
// (Resolución 8443 de 1998), no un formato propietario de terceros.
const PESOS = [71, 67, 59, 53, 47, 43, 41, 37, 29, 23, 19, 17, 13, 7, 3]

export function calcularDigitoVerificacionNit(nit) {
  const digitos = String(nit).replace(/\D/g, '')
  if (!digitos) return null

  const relleno = digitos.padStart(15, '0')
  let suma = 0
  for (let i = 0; i < 15; i++) {
    suma += Number(relleno[i]) * PESOS[i]
  }
  const resto = suma % 11
  return resto < 2 ? resto : 11 - resto
}

export function nitTieneFormatoValido(nit) {
  const digitos = String(nit || '').replace(/\D/g, '')
  return digitos.length >= 6 && digitos.length <= 15 && digitos === String(nit).trim()
}
