const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const passport = require('passport');

const sessionConfig = require('./config/session');
const initializePassport = require('./config/passport');
const errorHandler = require('./middlewares/errorHandler');

// Importar rutas
const authRoutes = require('./routes/authRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();

// ========================
// Middlewares globales
// ========================

// Parseo de JSON y URL-encoded
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookie parser
app.use(cookieParser());

// CORS
app.use(
  cors({
    origin: 'http://localhost:3000', // Ajustar según frontend
    credentials: true
  })
);

// Sesiones (debe ir ANTES de passport)
app.use(sessionConfig);

// Passport
initializePassport();
app.use(passport.initialize());
app.use(passport.session());

// ========================
// Rutas
// ========================

// Ruta de health check
app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'API de Autenticación Híbrida - Backend II',
    version: '1.0.0'
  });
});

// Rutas de la API
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/session', sessionRoutes);
app.use('/api/v1', userRoutes);

// ========================
// Manejo de errores
// ========================

// Ruta no encontrada
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Ruta ${req.originalUrl} no encontrada.`
  });
});

// Error handler centralizado
app.use(errorHandler);

module.exports = app;
