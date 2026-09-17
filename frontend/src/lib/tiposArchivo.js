// Debe coincidir con TIPOS_ORIGEN_VALIDOS del backend (cargas.validacionArchivo.js).
export const TIPOS_ORIGEN = [
  { codigo: 'PDF', etiqueta: 'PDF', accept: '.pdf' },
  { codigo: 'XML', etiqueta: 'XML', accept: '.xml' },
  { codigo: 'XLSX', etiqueta: 'Excel (.xlsx)', accept: '.xlsx' },
  { codigo: 'XLS', etiqueta: 'Excel 97-2003 (.xls)', accept: '.xls' },
  { codigo: 'CSV', etiqueta: 'CSV', accept: '.csv' },
  { codigo: 'JPG', etiqueta: 'Imagen JPG', accept: '.jpg,.jpeg' },
  { codigo: 'PNG', etiqueta: 'Imagen PNG', accept: '.png' },
]
