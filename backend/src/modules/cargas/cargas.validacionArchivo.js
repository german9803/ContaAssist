import { fileTypeFromBuffer } from 'file-type'

export const TIPOS_ORIGEN_VALIDOS = ['PDF', 'XML', 'XLSX', 'XLS', 'CSV', 'JPG', 'PNG']

// file-type detecta por contenido (magic bytes) los formatos binarios; XML y
// CSV son texto plano sin firma binaria, así que se validan con un heurístico
// propio (sección 22: no confiar solo en la extensión/nombre del archivo).
const FAMILIAS_BINARIAS = {
  PDF: { extensiones: ['pdf'], mimes: ['application/pdf'] },
  XLSX: {
    extensiones: ['xlsx'],
    mimes: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/zip'],
  },
  XLS: { extensiones: ['xls'], mimes: ['application/x-cfb', 'application/vnd.ms-excel'] },
  JPG: { extensiones: ['jpg', 'jpeg'], mimes: ['image/jpeg'] },
  PNG: { extensiones: ['png'], mimes: ['image/png'] },
}

function extensionDe(nombreArchivo) {
  const punto = nombreArchivo.lastIndexOf('.')
  return punto === -1 ? '' : nombreArchivo.slice(punto + 1).toLowerCase()
}

function pareceTextoPlano(buffer) {
  const muestra = buffer.subarray(0, 8000)
  if (muestra.includes(0)) return false // byte nulo => contenido binario
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(muestra)
    return true
  } catch {
    return false
  }
}

function pareceXml(buffer) {
  if (!pareceTextoPlano(buffer)) return false
  const inicio = buffer.subarray(0, 200).toString('utf-8').trimStart()
  return inicio.startsWith('<?xml') || /^<[a-zA-Z]/.test(inicio)
}

export async function validarArchivo(buffer, nombreOriginal, tipoOrigenDeclarado) {
  const extension = extensionDe(nombreOriginal)

  if (tipoOrigenDeclarado === 'XML') {
    if (extension !== 'xml') return { valido: false, extension, motivo: 'La extensión del archivo no es .xml' }
    if (!pareceXml(buffer)) return { valido: false, extension, motivo: 'El contenido no parece un XML válido' }
    return { valido: true, extension }
  }

  if (tipoOrigenDeclarado === 'CSV') {
    if (extension !== 'csv') return { valido: false, extension, motivo: 'La extensión del archivo no es .csv' }
    if (!pareceTextoPlano(buffer)) {
      return { valido: false, extension, motivo: 'El contenido no parece texto plano (CSV)' }
    }
    return { valido: true, extension }
  }

  const familia = FAMILIAS_BINARIAS[tipoOrigenDeclarado]
  if (!familia.extensiones.includes(extension)) {
    return {
      valido: false,
      extension,
      motivo: `La extensión .${extension || '?'} no corresponde a ${tipoOrigenDeclarado}`,
    }
  }

  const detectado = await fileTypeFromBuffer(buffer)
  if (!detectado || !familia.mimes.includes(detectado.mime)) {
    return {
      valido: false,
      extension,
      motivo: `El contenido del archivo no coincide con ${tipoOrigenDeclarado} (detectado: ${detectado?.mime || 'desconocido'})`,
    }
  }

  return { valido: true, extension }
}
