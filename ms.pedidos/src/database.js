const mariadb = require('mariadb');

const pool = mariadb.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'bd_restaurante', // Nombre exacto de la BD en phpMyAdmin
  port: process.env.DB_PORT || 3306,
  connectionLimit: 5
});

// Prueba de conexión inicial al arrancar el servidor
(async () => {
  let conn;
  try {
    conn = await pool.getConnection();
    console.log('✅ Conexión exitosa a MariaDB (bd_restaurante)');
  } catch (err) {
    console.error('❌ Error al conectar con MariaDB en ms.pedidos:', err.message);
  } finally {
    if (conn) conn.release();
  } 
})();

module.exports = pool;