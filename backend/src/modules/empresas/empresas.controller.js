import {
  crearEmpresa,
  listarEmpresasDeUsuario,
  obtenerEmpresa,
  actualizarEmpresa,
  listarUsuariosDeEmpresa,
  invitarUsuario,
  actualizarMembresia,
  EmpresaError,
} from './empresas.service.js'
import { esEmailValido, esTextoNoVacio } from '../../shared/validation.js'

const ROLES_VALIDOS = ['ADMINISTRADOR', 'AUXILIAR_CONTABLE', 'CONTADOR', 'CONSULTA']

function manejarError(error, res, next) {
  if (error instanceof EmpresaError) {
    return res.status(error.status).json({ error: error.message })
  }
  next(error)
}

export async function postEmpresa(req, res, next) {
  try {
    const { nit, razonSocial, nombreComercial } = req.body || {}

    if (!esTextoNoVacio(nit, { max: 20 })) {
      return res.status(400).json({ error: 'nit es requerido' })
    }
    if (!esTextoNoVacio(razonSocial, { max: 200 })) {
      return res.status(400).json({ error: 'razonSocial es requerido' })
    }

    const empresa = await crearEmpresa({
      nit,
      razonSocial,
      nombreComercial,
      usuarioCreadorId: req.usuario.id,
    })
    res.status(201).json(empresa)
  } catch (error) {
    manejarError(error, res, next)
  }
}

export async function getEmpresas(req, res, next) {
  try {
    const empresas = await listarEmpresasDeUsuario(req.usuario.id)
    res.json(empresas)
  } catch (error) {
    manejarError(error, res, next)
  }
}

export async function getEmpresa(req, res, next) {
  try {
    const empresa = await obtenerEmpresa(req.empresaId)
    res.json(empresa)
  } catch (error) {
    manejarError(error, res, next)
  }
}

export async function patchEmpresa(req, res, next) {
  try {
    const { razonSocial, nombreComercial } = req.body || {}

    if (razonSocial !== undefined && !esTextoNoVacio(razonSocial, { max: 200 })) {
      return res.status(400).json({ error: 'razonSocial inválido' })
    }

    const empresa = await actualizarEmpresa(req.empresaId, { razonSocial, nombreComercial })
    res.json(empresa)
  } catch (error) {
    manejarError(error, res, next)
  }
}

export async function getUsuariosDeEmpresa(req, res, next) {
  try {
    const usuarios = await listarUsuariosDeEmpresa(req.empresaId)
    res.json(usuarios)
  } catch (error) {
    manejarError(error, res, next)
  }
}

export async function postUsuarioEnEmpresa(req, res, next) {
  try {
    const { email, nombreCompleto, rolCodigo } = req.body || {}

    if (!esEmailValido(email)) {
      return res.status(400).json({ error: 'Email inválido' })
    }
    if (!ROLES_VALIDOS.includes(rolCodigo)) {
      return res.status(400).json({ error: `rolCodigo debe ser uno de: ${ROLES_VALIDOS.join(', ')}` })
    }

    const resultado = await invitarUsuario({
      empresaId: req.empresaId,
      email,
      nombreCompleto,
      rolCodigo,
    })
    res.status(201).json(resultado)
  } catch (error) {
    manejarError(error, res, next)
  }
}

export async function patchUsuarioEnEmpresa(req, res, next) {
  try {
    const { rolCodigo, activo } = req.body || {}

    if (rolCodigo !== undefined && !ROLES_VALIDOS.includes(rolCodigo)) {
      return res.status(400).json({ error: `rolCodigo debe ser uno de: ${ROLES_VALIDOS.join(', ')}` })
    }
    if (activo !== undefined && typeof activo !== 'boolean') {
      return res.status(400).json({ error: 'activo debe ser booleano' })
    }

    const membresia = await actualizarMembresia({
      empresaId: req.empresaId,
      usuarioId: req.params.usuarioId,
      rolCodigo,
      activo,
    })
    res.json(membresia)
  } catch (error) {
    manejarError(error, res, next)
  }
}
