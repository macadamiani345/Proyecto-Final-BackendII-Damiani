const passport = require('passport');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config/env');

// POST /api/v1/auth/register
const register = async (req, res, next) => {
  try {
    const { first_name, last_name, email, password } = req.body;

    // Validar campos obligatorios
    if (!first_name || !email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Los campos first_name, email y password son obligatorios.'
      });
    }

    // Verificar si el email ya está registrado
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        status: 'error',
        message: 'El email ya está registrado.'
      });
    }

    // Crear usuario (el hash de la password se hace en el pre-save del modelo)
    const newUser = await User.create({
      first_name,
      last_name: last_name || '',
      email,
      password,
      provider: 'local',
      role: 'user'
    });

    res.status(201).json({
      status: 'success',
      message: 'Usuario registrado exitosamente.',
      payload: newUser
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/auth/login
const login = (req, res, next) => {
  passport.authenticate('local', { session: false }, (err, user, info) => {
    if (err) return next(err);

    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: info?.message || 'Credenciales inválidas.'
      });
    }

    // Guardar usuario en sesión
    req.logIn(user, (err) => {
      if (err) return next(err);

      // Generar JWT con payload { userId, role } y expiración de 1 hora
      const tokenPayload = {
        userId: user._id,
        role: user.role
      };

      const token = jwt.sign(tokenPayload, config.jwtSecret, {
        expiresIn: '1h'
      });

      // Enviar token en cookie httpOnly
      res.cookie('authToken', token, {
        httpOnly: true,
        sameSite: 'Lax',
        secure: config.isProduction,
        maxAge: 3600000 // 1 hora
      });

      // Enviar respuesta con token también en el body
      res.status(200).json({
        status: 'success',
        message: 'Login exitoso.',
        token,
        payload: user
      });
    });
  })(req, res, next);
};

// GET /api/v1/auth/github → redirige a GitHub (lo maneja Passport automáticamente)
// GET /api/v1/auth/github/callback
const githubCallback = (req, res, next) => {
  passport.authenticate('github', { session: true }, (err, user, info) => {
    if (err) return next(err);

    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: info?.message || 'Error en autenticación con GitHub.'
      });
    }

    req.logIn(user, (err) => {
      if (err) return next(err);

      // Generar JWT para el usuario de GitHub también
      const tokenPayload = {
        userId: user._id,
        role: user.role
      };

      const token = jwt.sign(tokenPayload, config.jwtSecret, {
        expiresIn: '1h'
      });

      // Setear cookie con el token
      res.cookie('authToken', token, {
        httpOnly: true,
        sameSite: 'Lax',
        secure: config.isProduction,
        maxAge: 3600000
      });

      // Redirigir a una ruta de éxito (o enviar JSON)
      res.status(200).json({
        status: 'success',
        message: 'Login con GitHub exitoso.',
        token,
        payload: user
      });
    });
  })(req, res, next);
};

// POST /api/v1/auth/logout
const logout = (req, res, next) => {
  // 1. Destruir la sesión
  req.session.destroy((err) => {
    if (err) {
      console.error('Error al destruir sesión:', err);
      return next(err);
    }

    // 2. Limpiar la cookie de sesión
    res.clearCookie('connect.sid');

    // 3. Limpiar la cookie del token JWT
    res.clearCookie('authToken');

    // 4. Responder al cliente
    res.status(200).json({
      status: 'success',
      message: 'Logout exitoso. Sesión destruida y cookies limpiadas.'
    });
  });
};

module.exports = {
  register,
  login,
  githubCallback,
  logout
};
