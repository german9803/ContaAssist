import { parse } from 'csv-parse/sync'
import { interpretarFilas } from './plantillaTabular.js'

export function parsearCsv(buffer) {
  try {
    const registros = parse(buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
      comment: '#', // varios exportadores de CSV incluyen una línea de comentario inicial
      relax_column_count: true, // una fila con más/menos columnas no debe tumbar todo el archivo
    })
    return interpretarFilas(registros)
  } catch (error) {
    // Un archivo realmente irrecuperable (encoding roto, etc.) no debe lanzar
    // — se reporta como una sola "fila" fallida, en el mismo formato que
    // produce interpretarFilas, para que quien llama no necesite un caso especial.
    return [{ fila: null, valido: false, errores: [`Archivo CSV inválido o corrupto: ${error.message}`] }]
  }
}
