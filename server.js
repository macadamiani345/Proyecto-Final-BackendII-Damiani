const app = require('./src/app');
const connectDB = require('./src/config/db');
const config = require('./src/config/env');

const startServer = async () => {
  try {
    // Conectar a MongoDB
    await connectDB();

    // Iniciar servidor
    app.listen(config.port, () => {
      console.log(`🚀 Servidor corriendo en http://localhost:${config.port}`);
      console.log(`📌 Entorno: ${config.nodeEnv}`);
    });
  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error.message);
    process.exit(1);
  }
};

startServer();
