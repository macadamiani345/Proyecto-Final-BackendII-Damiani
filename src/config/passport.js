const passport = require('passport');
const localStrategy = require('../strategies/localStrategy');
const githubStrategy = require('../strategies/githubStrategy');
const User = require('../models/User');

const initializePassport = () => {
  // Registrar estrategias
  passport.use('local', localStrategy);
  passport.use('github', githubStrategy);

  // Serialización: qué dato del usuario se guarda en la sesión
  passport.serializeUser((user, done) => {
    done(null, user._id);
  });

  // Deserialización: cómo se recupera el usuario desde la sesión
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });
};

module.exports = initializePassport;
