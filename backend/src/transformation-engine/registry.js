import { adaptadorExcel } from '../adapters/excel/adapter.js'
import { adaptadorCsv } from '../adapters/csv/adapter.js'
import { adaptadorWordOffice } from '../adapters/wordoffice/adapter.js'

// Cada adaptador (WordOffice, Siigo, Excel, CSV) se agrega aquí cuando su fase
// lo construye — engine.js y el resto del sistema solo conocen esta lista y la
// interfaz común descrita en docs/transformation-engine.md, nunca el detalle
// interno de un destino concreto. Siigo sigue bloqueado (Fase 14) por falta
// de insumos oficiales propios (los aportados hasta ahora son de WordOffice).
export const ADAPTADORES = [adaptadorExcel, adaptadorCsv, adaptadorWordOffice]

export function obtenerAdaptador(codigo) {
  return ADAPTADORES.find((adaptador) => adaptador.codigo === codigo) ?? null
}
