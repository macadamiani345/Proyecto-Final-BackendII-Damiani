// Middleware centralizado de manejo de errores
const errorHandler = (err, req, res, next) => {
  console.error('❌ Error:', err.message);

  // Error de validación de Mongoose
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      status: 'error',
      message: 'Error de validación',
      errors
    });
  }

  // Error de clave duplicada (MongoDB)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({
      status: 'error',
      message: `El campo '${field}' ya está registrado.`
    });
  }

  // Error de JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      status: 'error',
      message: 'Token inválido.'
    });
  }

  // Error genérico
  res.status(err.status || 500).json({
    status: 'error',
    message: err.message || 'Error interno del servidor'
  });
};

module.exports = errorHandler;
