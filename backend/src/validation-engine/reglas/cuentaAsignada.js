export default {
  codigo: 'CUENTA_NO_ASIGNADA',
  severidad: 'ADVERTENCIA',
  aplicaA: () => true,
  evaluar(documento) {
    if (!documento.cuentaContableId) {
      return { resultado: 'FALLA', mensaje: 'El documento no tiene cuenta contable asignada' }
    }
    return { resultado: 'OK' }
  },
}
