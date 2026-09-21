import { COLUMNAS, validarPrerequisitosContaAssist, transformarContaAssist } from '../formatoContaAssist.js'

const DELIMITADOR = ','

// Encierra en comillas solo cuando el campo contiene el delimitador, comillas
// o salto de línea — evita comillas innecesarias en la mayoría de los campos.
function escaparCampo(valor) {
  const texto = String(valor ?? '')
  return /[",\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto
}

export const adaptadorCsv = {
  codigo: 'CSV',
  versionFormato: '1.0',
  extension: 'csv',
  validarPrerequisitos: validarPrerequisitosContaAssist,
  transformar: transformarContaAssist,

  generarArchivo(registros) {
    const encabezado = COLUMNAS.map((c) => c.encabezado).join(DELIMITADOR)
    const filas = registros.map((registro) => COLUMNAS.map((c) => escaparCampo(registro[c.clave])).join(DELIMITADOR))
    return Buffer.from([encabezado, ...filas].join('\r\n'), 'utf-8')
  },
}
