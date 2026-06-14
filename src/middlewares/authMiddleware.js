const jwt = require('jsonwebtoken');
const config = require('../config/env');

// Middleware de autenticación: verifica JWT desde cookie o header Authorization
const authMiddleware = (req, res, next) => {
  // 1. Intentar obtener el token de la cookie
  let token = req.cookies?.authToken;

  // 2. Si no hay cookie, intentar desde el header Authorization
  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
  }

  // 3. Si no hay token en ningún lado, retornar 401
  if (!token) {
    return res.status(401).json({
      status: 'error',
      message: 'No autenticado. Se requiere un token válido.'
    });
  }

  // 4. Verificar y decodificar el token
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded; // { userId, role, iat, exp }
    next();
  } catch (error) {
    const message =
      error.name === 'TokenExpiredError'
        ? 'Token expirado. Iniciá sesión nuevamente.'
        : 'Token inválido.';

    return res.status(401).json({
      status: 'error',
      message
    });
  }
};

module.exports = authMiddleware;
