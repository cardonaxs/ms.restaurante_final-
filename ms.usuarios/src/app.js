const express = require('express');
const usuarioRoutes = require('./routes/usuario.routes');

const app = express();

// Middleware para procesar JSON en el cuerpo de las peticiones
app.use(express.json());

// Definición de la ruta base para usuarios
app.use('/api/usuarios', usuarioRoutes);

// Puerto 3001 para ms.usuarios (para no interferir con el puerto 3003 de ms.pedidos)
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`✅ Microservicio de Usuarios ejecutándose en el puerto ${PORT}`);
});