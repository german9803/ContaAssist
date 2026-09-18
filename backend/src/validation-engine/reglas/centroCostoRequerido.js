// La sección 13 del brief condiciona esta regla a "si la empresa exige centro
// de costo" — no existe todavía una configuración por empresa para eso, así
// que se evalúa siempre como advertencia (no bloquea) en vez de inventar un
// interruptor que nadie puede configurar aún.
export default {
  codigo: 'CENTRO_COSTO_REQUERIDO',
  severidad: 'ADVERTENCIA',
  aplicaA: () => true,
  evaluar(documento) {
    if (!documento.centroCostoId) {
      return { resultado: 'FALLA', mensaje: 'El documento no tiene centro de costo asignado' }
    }
    return { resultado: 'OK' }
  },
}
