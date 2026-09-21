import { mkdir, writeFile, readFile } from 'node:fs/promises'
import path from 'node:path'

const STORAGE_DIR = process.env.STORAGE_DIR
  ? path.resolve(process.env.STORAGE_DIR)
  : path.resolve(process.cwd(), 'storage')

// Mismo criterio que cargas.storage.js: la ruta se arma solo con ids
// generados por el servidor (empresaId/exportacionId, ambos UUID) y una
// extensión de una lista cerrada, nunca con datos que vengan del cliente.
export async function guardarArchivoExportacion({ empresaId, exportacionId, extension, buffer }) {
  const dir = path.join(STORAGE_DIR, empresaId, 'exportaciones')
  await mkdir(dir, { recursive: true })
  const rutaAbsoluta = path.join(dir, `${exportacionId}.${extension}`)
  await writeFile(rutaAbsoluta, buffer)
  return path.relative(STORAGE_DIR, rutaAbsoluta)
}

export function leerArchivoExportacion(rutaRelativa) {
  return readFile(path.join(STORAGE_DIR, rutaRelativa))
}
