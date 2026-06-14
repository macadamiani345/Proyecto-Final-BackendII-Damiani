const { Strategy: LocalStrategy } = require('passport-local');
const User = require('../models/User');

const localStrategy = new LocalStrategy(
  {
    usernameField: 'email',
    passwordField: 'password'
  },
  async (email, password, done) => {
    try {
      // Buscar usuario por email
      const user = await User.findOne({ email });

      if (!user) {
        return done(null, false, { message: 'Usuario no encontrado' });
      }

      // Verificar que sea un usuario local (no OAuth)
      if (user.provider !== 'local') {
        return done(null, false, {
          message: `Este email está registrado con ${user.provider}. Usá ese método para iniciar sesión.`
        });
      }

      // Comparar password
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return done(null, false, { message: 'Contraseña incorrecta' });
      }

      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }
);

module.exports = localStrategy;
