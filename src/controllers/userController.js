const User = require('../models/User');

// GET /api/v1/profile — Protegida por JWT (authMiddleware)
const getProfile = async (req, res, next) => {
  try {
    // req.user contiene { userId, role } del token JWT
    const user = await User.findById(req.user.userId).select('-password');

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'Usuario no encontrado.'
      });
    }

    res.status(200).json({
      status: 'success',
      payload: user
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/admin — Protegida por JWT + rol admin
const getAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');

    res.status(200).json({
      status: 'success',
      message: 'Bienvenido al panel de administración.',
      payload: {
        user,
        adminData: {
          totalUsers: await User.countDocuments(),
          message: 'Acceso de administrador verificado.'
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfile,
  getAdmin
};
