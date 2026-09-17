export default {
  codigo: 'CAMPO_OBLIGATORIO_FALTANTE',
  severidad: 'BLOQUEANTE',
  aplicaA: () => true,
  evaluar(documento) {
    const faltantes = []
    if (!documento.numeroDocumento) faltantes.push('número')
    if (!documento.fechaEmision) faltantes.push('fecha de emisión')
    if (!documento.terceroId) faltantes.push('tercero')
    if (documento.total === null || documento.total === undefined) faltantes.push('total')

    if (faltantes.length > 0) {
      return { resultado: 'FALLA', mensaje: `Faltan campos obligatorios: ${faltantes.join(', ')}` }
    }
    return { resultado: 'OK' }
  },
}
