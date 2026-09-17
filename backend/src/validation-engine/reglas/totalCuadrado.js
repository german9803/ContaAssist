const TOLERANCIA = 1 // redondeo

export default {
  codigo: 'TOTAL_DESCUADRADO',
  severidad: 'BLOQUEANTE',
  aplicaA: (documento) => documento.subtotal !== null && documento.total !== null,
  evaluar(documento) {
    const subtotal = Number(documento.subtotal)
    const impuestos = Number(documento.totalImpuestos ?? 0)
    const retenciones = Number(documento.totalRetenciones ?? 0)
    const total = Number(documento.total)

    const esperado = subtotal + impuestos - retenciones
    const diferencia = Math.abs(esperado - total)

    if (diferencia > TOLERANCIA) {
      return {
        resultado: 'FALLA',
        mensaje: `subtotal + impuestos - retenciones (${esperado.toFixed(2)}) no coincide con total (${total.toFixed(2)})`,
      }
    }
    return { resultado: 'OK' }
  },
}
