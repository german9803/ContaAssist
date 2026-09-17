import { calcularDigitoVerificacionNit, nitTieneFormatoValido } from '../nit.js'

export default {
  codigo: 'NIT_INVALIDO',
  severidad: 'BLOQUEANTE',
  aplicaA: (documento) => documento.tercero?.tipoIdentificacion === 'NIT',
  evaluar(documento) {
    const { identificacion, dv } = documento.tercero

    if (!nitTieneFormatoValido(identificacion)) {
      return { resultado: 'FALLA', mensaje: `NIT "${identificacion}" no tiene un formato numérico válido` }
    }

    if (dv) {
      const dvCalculado = calcularDigitoVerificacionNit(identificacion)
      if (String(dvCalculado) !== String(dv)) {
        return {
          resultado: 'FALLA',
          mensaje: `Dígito de verificación inválido: se registró ${dv}, el calculado es ${dvCalculado}`,
        }
      }
    }

    return { resultado: 'OK' }
  },
}
