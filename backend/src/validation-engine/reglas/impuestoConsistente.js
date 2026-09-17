const TOLERANCIA = 1

export default {
  codigo: 'IMPUESTO_INCONSISTENTE',
  severidad: 'ADVERTENCIA',
  aplicaA: (documento) => documento.totalImpuestos !== null && documento.totalImpuestos !== undefined,
  evaluar(documento) {
    const sumaImpuestos = (documento.impuestos || []).reduce((acc, i) => acc + Number(i.valor), 0)
    const declarado = Number(documento.totalImpuestos)

    if (Math.abs(sumaImpuestos - declarado) > TOLERANCIA) {
      return {
        resultado: 'FALLA',
        mensaje: `La suma de impuestos detallados (${sumaImpuestos.toFixed(2)}) no coincide con total_impuestos (${declarado.toFixed(2)})`,
      }
    }
    return { resultado: 'OK' }
  },
}
