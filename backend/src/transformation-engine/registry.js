// Cada adaptador (WordOffice, Siigo, Excel, CSV) se agrega aquí cuando su fase
// lo construye — engine.js y el resto del sistema solo conocen esta lista y la
// interfaz común descrita en docs/transformation-engine.md, nunca el detalle
// interno de un destino concreto.
export const ADAPTADORES = []

export function obtenerAdaptador(codigo) {
  return ADAPTADORES.find((adaptador) => adaptador.codigo === codigo) ?? null
}
