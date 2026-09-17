import { PDFParse } from 'pdf-parse'

// Extrae el texto embebido de un PDF (capa de texto real, no una imagen
// escaneada). NO es OCR ni IA — solo funciona si el PDF fue generado
// digitalmente (la mayoría de facturas electrónicas en PDF lo son). No se
// intenta adivinar número/fecha/NIT/totales con expresiones regulares: eso
// arriesgaría completar campos contables con datos incorrectos sin que nadie
// los revise. El texto queda disponible para que un humano lo lea y
// complete los campos a mano (sección 24 — OCR/IA quedan para Fase 16/17).
export async function extraerTextoPdf(buffer) {
  const parser = new PDFParse({ data: buffer })
  try {
    const resultado = await parser.getText()
    return { texto: resultado.text?.trim() || null, error: null }
  } catch (error) {
    return { texto: null, error: error.message }
  } finally {
    await parser.destroy()
  }
}
