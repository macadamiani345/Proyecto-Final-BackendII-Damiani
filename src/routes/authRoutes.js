const { Router } = require('express');
const passport = require('passport');
const {
  register,
  login,
  githubCallback,
  logout
} = require('../controllers/authController');

const router = Router();

// Registro local
router.post('/register', register);

// Login local (Passport Local Strategy)
router.post('/login', login);

// Inicio de autenticación con GitHub
router.get(
  '/github',
  passport.authenticate('github', { scope: ['user:email'] })
);

// Callback de GitHub
router.get('/github/callback', githubCallback);

// Logout
router.post('/logout', logout);

module.exports = router;
