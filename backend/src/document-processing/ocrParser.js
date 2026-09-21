import { createWorker } from 'tesseract.js'

// OCR local con Tesseract.js (Fase 16) — corre en el propio backend, sin
// servicio externo de pago ni API key. Igual que el parser de PDF (Fase 7):
// NO intenta adivinar número/fecha/NIT/totales con expresiones regulares
// sobre el texto reconocido — arriesgaría completar campos contables con
// datos incorrectos sin que nadie los revise (docs/architecture.md: "la
// extracción se marca siempre como 'requiere revisión humana'"). El texto
// queda para que un humano lo lea y complete los campos a mano, igual que
// con el texto extraído de un PDF.
//
// Reconoce en español ('spa'), el idioma de las facturas colombianas. La
// primera vez que se usa en el equipo, Tesseract descarga el modelo de
// idioma (~15MB) desde internet y lo cachea localmente — llamadas
// posteriores no requieren red.
export async function extraerTextoImagen(buffer) {
  let worker
  try {
    worker = await createWorker('spa', undefined, {
      // Sin esto, un buffer que no es una imagen válida hace que
      // tesseract.js relance el error dentro de su manejador interno de
      // mensajes (además de rechazar la promesa de recognize(), que sí
      // capturamos abajo) y tumbe el proceso completo — ver
      // node_modules/tesseract.js/src/createWorker.js, bloque
      // `status === 'reject'`. Un archivo corrupto debe ser un resultado
      // fallido, no una excepción sin atrapar (mismo criterio que
      // procesamiento.service.js con CSV/XLSX malformados).
      errorHandler: () => {},
    })
    const { data } = await worker.recognize(buffer)
    const texto = data.text?.trim() || null
    return { texto, confianza: data.confidence ?? null, error: null }
  } catch (error) {
    const mensaje = typeof error === 'string' ? error : error?.message || 'Error desconocido de OCR'
    return { texto: null, confianza: null, error: mensaje }
  } finally {
    if (worker) await worker.terminate()
  }
}
