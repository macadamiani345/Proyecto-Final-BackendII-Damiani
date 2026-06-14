const dotenv = require('dotenv');
dotenv.config();

const config = {
  port: process.env.PORT || 8080,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  sessionSecret: process.env.SESSION_SECRET,
  github: {
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackUrl: process.env.GITHUB_CALLBACK_URL
  },
  isProduction: process.env.NODE_ENV === 'production'
};

// Validación de variables de entorno obligatorias
const requiredVars = ['MONGO_URI', 'JWT_SECRET', 'SESSION_SECRET'];
for (const varName of requiredVars) {
  if (!process.env[varName]) {
    console.warn(`⚠️  Variable de entorno ${varName} no está definida.`);
  }
}

module.exports = config;
