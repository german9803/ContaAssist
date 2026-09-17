export default {
  codigo: 'TERCERO_NO_IDENTIFICADO',
  severidad: 'BLOQUEANTE',
  aplicaA: () => true,
  evaluar(documento) {
    if (!documento.terceroId) {
      return { resultado: 'FALLA', mensaje: 'No se identificó el tercero del documento' }
    }
    return { resultado: 'OK' }
  },
}
