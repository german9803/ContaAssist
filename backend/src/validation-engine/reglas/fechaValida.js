export default {
  codigo: 'FECHA_INVALIDA',
  severidad: 'BLOQUEANTE',
  aplicaA: (documento) => Boolean(documento.fechaEmision),
  evaluar(documento) {
    const fecha = new Date(documento.fechaEmision)
    const manana = new Date()
    manana.setDate(manana.getDate() + 1)
    manana.setHours(0, 0, 0, 0)

    if (fecha.getTime() >= manana.getTime()) {
      return { resultado: 'FALLA', mensaje: 'La fecha de emisión está en el futuro' }
    }
    return { resultado: 'OK' }
  },
}
