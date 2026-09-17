import { mkdir, writeFile, readFile } from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'

const STORAGE_DIR = process.env.STORAGE_DIR
  ? path.resolve(process.env.STORAGE_DIR)
  : path.resolve(process.cwd(), 'storage')

export function calcularHash(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex')
}

// La ruta en disco se arma solo con ids generados por el servidor
// (empresaId/cargaId/archivoId, todos UUID) y una extensión de una lista
// cerrada — nunca con el nombre original del archivo (evita path traversal).
export async function guardarArchivo({ empresaId, cargaId, archivoId, extension, buffer }) {
  const dir = path.join(STORAGE_DIR, empresaId, cargaId)
  await mkdir(dir, { recursive: true })
  const rutaAbsoluta = path.join(dir, `${archivoId}.${extension}`)
  await writeFile(rutaAbsoluta, buffer)
  return path.relative(STORAGE_DIR, rutaAbsoluta)
}

export function leerArchivo(rutaRelativa) {
  return readFile(path.join(STORAGE_DIR, rutaRelativa))
}
