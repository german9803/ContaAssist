export default {
  codigo: 'FORMA_PAGO_FALTANTE',
  severidad: 'ADVERTENCIA',
  aplicaA: () => true,
  evaluar(documento) {
    if (!documento.formaPagoId) {
      return { resultado: 'FALLA', mensaje: 'No se identificó forma de pago' }
    }
    return { resultado: 'OK' }
  },
}
