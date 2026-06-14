const GitHubStrategy = require('passport-github2').Strategy;
const User = require('../models/User');
const config = require('../config/env');

const githubStrategy = new GitHubStrategy(
  {
    clientID: config.github.clientId,
    clientSecret: config.github.clientSecret,
    callbackURL: config.github.callbackUrl,
    scope: ['user:email']
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Buscar si ya existe un usuario con este providerId de GitHub
      let user = await User.findOne({
        provider: 'github',
        providerId: profile.id
      });

      if (user) {
        // Usuario ya existe, retornarlo
        return done(null, user);
      }

      // Obtener email del perfil de GitHub
      const email =
        profile.emails && profile.emails.length > 0
          ? profile.emails[0].value
          : `github_${profile.id}@noemail.com`;

      // Verificar si ya existe un usuario con ese email (registrado localmente)
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return done(null, false, {
          message: 'Ya existe una cuenta con ese email registrada localmente.'
        });
      }

      // Crear nuevo usuario con datos de GitHub
      const newUser = await User.create({
        first_name: profile.displayName || profile.username || 'GitHub User',
        last_name: '',
        email,
        provider: 'github',
        providerId: profile.id,
        avatar: profile.photos?.[0]?.value || null,
        role: 'user'
      });

      return done(null, newUser);
    } catch (error) {
      return done(error);
    }
  }
);

module.exports = githubStrategy;
