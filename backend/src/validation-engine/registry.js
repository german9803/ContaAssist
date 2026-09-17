import campoObligatorio from './reglas/campoObligatorio.js'
import fechaValida from './reglas/fechaValida.js'
import totalCuadrado from './reglas/totalCuadrado.js'
import terceroIdentificado from './reglas/terceroIdentificado.js'
import nitValido from './reglas/nitValido.js'
import documentoDuplicado from './reglas/documentoDuplicado.js'
import impuestoConsistente from './reglas/impuestoConsistente.js'

// Agregar una regla nueva = crear su archivo en /reglas y sumarla aquí — el
// motor (engine.js) y el resto del sistema no necesitan cambiar.
export const REGLAS = [
  campoObligatorio,
  fechaValida,
  totalCuadrado,
  terceroIdentificado,
  nitValido,
  documentoDuplicado,
  impuestoConsistente,
]
