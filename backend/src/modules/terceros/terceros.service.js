import { prisma } from '../../shared/prisma.js'
import { registrarAuditoria } from '../../audit/audit.service.js'
import { calcularDigitoVerificacionNit, nitTieneFormatoValido } from '../../validation-engine/nit.js'
import { TIPOS_IDENTIFICACION, TIPOS_TERCERO } from './terceros.constants.js'

class TerceroError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.status = status
  }
}

function serializarTercero(t) {
  return {
    id: t.id,
    tipoIdentificacion: t.tipoIdentificacion,
    identificacion: t.identificacion,
    dv: t.dv,
    razonSocial: t.razonSocial,
    tipoTercero: t.tipoTercero,
    email: t.email,
    telefono: t.telefono,
    ciudad: t.ciudad,
    activo: t.activo,
  }
}

// Valida identificación + calcula/verifica el DV para NIT (mismo algoritmo
// público de la DIAN usado por el validation-engine de Fase 8 — un tercero
// mal escrito ahora se rechaza al crearlo, en vez de esperar a que la
// regla NIT_INVALIDO lo detecte sobre un documento más adelante).
function validarIdentificacion({ tipoIdentificacion, identificacion, dv }) {
  if (tipoIdentificacion !== 'NIT') return { dv: dv || null }

  if (!nitTieneFormatoValido(identificacion)) {
    throw new TerceroError(`NIT "${identificacion}" no tiene un formato numérico válido`)
  }
  const dvCalculado = String(calcularDigitoVerificacionNit(identificacion))
  if (dv && String(dv) !== dvCalculado) {
    throw new TerceroError(`Dígito de verificación inválido: se recibió ${dv}, el calculado es ${dvCalculado}`)
  }
  return { dv: dvCalculado }
}

export async function listarTerceros({ empresaId, tipo, q, page = 1, pageSize = 20 }) {
  const where = {
    empresaId,
    ...(tipo ? { tipoTercero: tipo } : {}),
    ...(q
      ? { OR: [{ razonSocial: { contains: q, mode: 'insensitive' } }, { identificacion: { contains: q } }] }
      : {}),
  }
  const [total, terceros] = await Promise.all([
    prisma.tercero.count({ where }),
    prisma.tercero.findMany({ where, orderBy: { razonSocial: 'asc' }, skip: (page - 1) * pageSize, take: pageSize }),
  ])
  return { data: terceros.map(serializarTercero), total, page, pageSize }
}

export async function obtenerTercero({ empresaId, terceroId }) {
  const tercero = await prisma.tercero.findFirst({ where: { id: terceroId, empresaId } })
  if (!tercero) throw new TerceroError('Tercero no encontrado', 404)
  return serializarTercero(tercero)
}

export async function crearTercero({ empresaId, usuarioId, datos }) {
  const { tipoIdentificacion, identificacion, razonSocial, tipoTercero } = datos

  if (!TIPOS_IDENTIFICACION.includes(tipoIdentificacion)) {
    throw new TerceroError(`tipoIdentificacion debe ser uno de: ${TIPOS_IDENTIFICACION.join(', ')}`)
  }
  if (!identificacion?.trim()) throw new TerceroError('identificacion es requerida')
  if (!razonSocial?.trim()) throw new TerceroError('razonSocial es requerida')
  if (!TIPOS_TERCERO.includes(tipoTercero)) {
    throw new TerceroError(`tipoTercero debe ser uno de: ${TIPOS_TERCERO.join(', ')}`)
  }

  const { dv } = validarIdentificacion({ tipoIdentificacion, identificacion, dv: datos.dv })

  const yaExiste = await prisma.tercero.findUnique({
    where: { empresaId_tipoIdentificacion_identificacion: { empresaId, tipoIdentificacion, identificacion } },
  })
  if (yaExiste) throw new TerceroError('Ya existe un tercero con esa identificación en esta empresa', 409)

  const tercero = await prisma.tercero.create({
    data: {
      empresaId,
      tipoIdentificacion,
      identificacion,
      dv,
      razonSocial,
      tipoTercero,
      email: datos.email || null,
      telefono: datos.telefono || null,
      ciudad: datos.ciudad || null,
    },
  })

  await registrarAuditoria({
    empresaId,
    usuarioId,
    accion: 'CREAR_TERCERO',
    entidad: 'tercero',
    entidadId: tercero.id,
    valorNuevo: `${tipoIdentificacion} ${identificacion} — ${razonSocial}`,
  })

  return serializarTercero(tercero)
}

// No se permite cambiar tipoIdentificacion/identificacion por PATCH: sería
// efectivamente convertirlo en otro tercero, y arriesgaría reatribuir en
// silencio todos los documentos históricos que ya apuntan a este id. Si la
// identificación estaba mal, se desactiva este registro y se crea uno nuevo.
export async function actualizarTercero({ empresaId, terceroId, usuarioId, cambios }) {
  const existente = await prisma.tercero.findFirst({ where: { id: terceroId, empresaId } })
  if (!existente) throw new TerceroError('Tercero no encontrado', 404)

  const data = {}
  if (cambios.razonSocial !== undefined) {
    if (!cambios.razonSocial?.trim()) throw new TerceroError('razonSocial no puede quedar vacía')
    data.razonSocial = cambios.razonSocial
  }
  if (cambios.tipoTercero !== undefined) {
    if (!TIPOS_TERCERO.includes(cambios.tipoTercero)) {
      throw new TerceroError(`tipoTercero debe ser uno de: ${TIPOS_TERCERO.join(', ')}`)
    }
    data.tipoTercero = cambios.tipoTercero
  }
  if (cambios.email !== undefined) data.email = cambios.email || null
  if (cambios.telefono !== undefined) data.telefono = cambios.telefono || null
  if (cambios.ciudad !== undefined) data.ciudad = cambios.ciudad || null
  if (cambios.activo !== undefined) data.activo = Boolean(cambios.activo)

  const actualizado = await prisma.tercero.update({ where: { id: terceroId }, data })

  for (const campo of Object.keys(data)) {
    await registrarAuditoria({
      empresaId,
      usuarioId,
      accion: 'MODIFICAR_TERCERO',
      entidad: 'tercero',
      entidadId: terceroId,
      campo,
      valorAnterior: existente[campo] !== null && existente[campo] !== undefined ? String(existente[campo]) : null,
      valorNuevo: data[campo] !== null && data[campo] !== undefined ? String(data[campo]) : null,
    })
  }

  return serializarTercero(actualizado)
}

export { TerceroError }
