const session = require('express-session');
const MongoStore = require('connect-mongo');
const config = require('./env');

const sessionConfig = session({
  store: MongoStore.create({
    mongoUrl: config.mongoUri,
    ttl: 60 * 60, // 1 hora en segundos
    collectionName: 'sessions'
  }),
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'Lax',
    secure: config.isProduction,
    maxAge: 1000 * 60 * 60 // 1 hora en milisegundos
  }
});

module.exports = sessionConfig;
