// Middleware de autorización por rol
// Uso: roleMiddleware('admin') o roleMiddleware('user', 'admin')
const roleMiddleware = (...allowedRoles) => {
  return (req, res, next) => {
    // req.user fue seteado por authMiddleware con el payload del JWT
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'No autenticado.'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'No autorizado. No tenés permisos para acceder a este recurso.'
      });
    }

    next();
  };
};

module.exports = roleMiddleware;
