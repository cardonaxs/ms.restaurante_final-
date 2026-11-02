require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'clave_secreta_del_proyecto';

app.use(cors());

// Middleware de validación JWT en el Gateway
const validarJWT = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      error: 'Acceso denegado (API Gateway)',
      mensaje: 'No se proporcionó un token JWT de autenticación'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.headers['x-user-id'] = decoded.id;
    req.headers['x-user-rol'] = decoded.rol;
    next();
  } catch (error) {
    return res.status(403).json({
      error: 'Acceso denegado (API Gateway)',
      mensaje: 'El token JWT es inválido o ha expirado'
    });
  }
};

// -------------------------------------------------------------
// REDIRECCIÓN DE RUTAS (PROXIES CON REWRITE)
// -------------------------------------------------------------

// 1. MS USUARIOS (Garantiza retransmitir /api/usuarios al backend)
app.use(
  '/api/usuarios',
  createProxyMiddleware({
    target: process.env.MS_USUARIOS_URL || 'http://localhost:3001',
    changeOrigin: true,
    pathRewrite: {
      '^/': '/api/usuarios/' // Agrega de vuelta el prefijo que Express remueve
    }
  })
);

// 2. MS MENU
app.use(
  '/api/menu',
  validarJWT,
  createProxyMiddleware({
    target: process.env.MS_MENU_URL || 'http://localhost:3002',
    changeOrigin: true,
    pathRewrite: {
      '^/': '/api/menu/'
    }
  })
);

// 3. MS PEDIDOS
app.use(
  '/api/pedidos',
  validarJWT,
  createProxyMiddleware({
    target: process.env.MS_PEDIDOS_URL || 'http://localhost:3003',
    changeOrigin: true,
    pathRewrite: {
      '^/': '/api/pedidos/'
    }
  })
);

app.listen(PORT, () => {
  console.log(`🚀 API Gateway escuchando en http://localhost:${PORT}`);
});