const express = require('express');
const cors = require('cors');
require('dotenv').config();

const menuRoutes = require('./routes/menu.routes');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

// Montamos en ambos paths para asegurar compatibilidad con el Gateway
app.use('/api/menu', menuRoutes);
app.use('/', menuRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada en ms.menu' });
});

app.listen(PORT, () => {
  console.log(`🟢 Microservicio ms.menu activo en el puerto ${PORT}`);
});

module.exports = app;