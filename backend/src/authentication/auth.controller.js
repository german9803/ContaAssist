import { login, refrescarSesion, obtenerPerfil, registrar, AuthError } from './auth.service.js'
import { esEmailValido, esTextoNoVacio } from '../shared/validation.js'

export async function postRegistro(req, res, next) {
  try {
    const { email, password, nombreCompleto, empresaNit, empresaRazonSocial, empresaNombreComercial } =
      req.body || {}

    if (!esEmailValido(email)) {
      return res.status(400).json({ error: 'Email inválido' })
    }
    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' })
    }
    if (!esTextoNoVacio(nombreCompleto, { max: 150 })) {
      return res.status(400).json({ error: 'nombreCompleto es requerido' })
    }
    if (!esTextoNoVacio(empresaNit, { max: 20 })) {
      return res.status(400).json({ error: 'empresaNit es requerido' })
    }
    if (!esTextoNoVacio(empresaRazonSocial, { max: 200 })) {
      return res.status(400).json({ error: 'empresaRazonSocial es requerido' })
    }

    const resultado = await registrar({
      email,
      password,
      nombreCompleto,
      empresaNit,
      empresaRazonSocial,
      empresaNombreComercial,
    })
    res.status(201).json(resultado)
  } catch (error) {
    if (error instanceof AuthError) {
      return res.status(error.status).json({ error: error.message })
    }
    next(error)
  }
}

export async function postLogin(req, res, next) {
  try {
    const { email, password } = req.body || {}

    if (!esEmailValido(email) || typeof password !== 'string' || password.length === 0) {
      return res.status(400).json({ error: 'Email y password son requeridos' })
    }

    const resultado = await login(email, password)
    res.json(resultado)
  } catch (error) {
    if (error instanceof AuthError) {
      return res.status(error.status).json({ error: error.message })
    }
    next(error)
  }
}

export async function postRefresh(req, res, next) {
  try {
    const { refreshToken } = req.body || {}
    if (typeof refreshToken !== 'string' || refreshToken.length === 0) {
      return res.status(400).json({ error: 'refreshToken es requerido' })
    }

    const resultado = await refrescarSesion(refreshToken)
    res.json(resultado)
  } catch (error) {
    if (error instanceof AuthError) {
      return res.status(error.status).json({ error: error.message })
    }
    next(error)
  }
}

export function postLogout(req, res) {
  // Los tokens son stateless (sin lista de revocación en esta fase);
  // cerrar sesión es responsabilidad del cliente al descartar los tokens.
  res.status(204).send()
}

export async function getMe(req, res, next) {
  try {
    const perfil = await obtenerPerfil(req.usuario.id)
    res.json(perfil)
  } catch (error) {
    if (error instanceof AuthError) {
      return res.status(error.status).json({ error: error.message })
    }
    next(error)
  }
}
