const mariadb = require('mariadb');

// Crear el pool de conexiones a la base de datos de XAMPP
const pool = mariadb.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',      // Usuario por defecto en XAMPP
  password: process.env.DB_PASSWORD || '',   // Contraseña vacía por defecto en XAMPP
  database: process.env.DB_NAME || 'bd_restaurante',
  port: process.env.DB_PORT || 3306,
  connectionLimit: 5
});

// Función auxiliar para obtener una conexión
async function getConnection() {
  try {
    const connection = await pool.getConnection();
    return connection;
  } catch (error) {
    console.error('❌ Error al conectar a MariaDB/MySQL:', error.message);
    throw error;
  }
}

module.exports = {
  pool,
  getConnection
};