require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('Falta configurar JWT_SECRET');
}

// Dentro de Docker NO se usa localhost: cada microservicio se llama por el
// nombre del servicio del docker-compose (ms-usuarios, ms-menu, ms-pedidos).
// Estos valores los inyecta docker-compose.yml; el localhost es solo para
// correr el gateway a mano con "node index.js".
const MS_USUARIOS_URL = process.env.MS_USUARIOS_URL || 'http://localhost:3001';
const MS_MENU_URL = process.env.MS_MENU_URL || 'http://localhost:3002';
const MS_PEDIDOS_URL = process.env.MS_PEDIDOS_URL || 'http://localhost:3003';

// Middleware de validación JWT en el Gateway
const validarJWT = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.match(/^Bearer\s+(.+)$/i)?.[1];

  if (!token) {
    return res.status(401).json({
      error: 'Acceso denegado (API Gateway)',
      mensaje: 'No se proporcionó un token JWT de autenticación'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.headers['x-user-id'] = String(decoded.id);
    req.headers['x-user-rol'] = String(decoded.rol);
    next();
  } catch (error) {
    return res.status(403).json({
      error: 'Acceso denegado (API Gateway)',
      mensaje: 'El token JWT es inválido o ha expirado'
    });
  }
};

const soloAdmin = (req, res, next) => {
  if (req.headers['x-user-rol'] !== 'admin') {
    return res.status(403).json({ error: 'Esta acción requiere permisos de administrador' });
  }
  next();
};

// Proxy que reenvía la ruta COMPLETA tal cual llegó (/api/menu/..., etc.).
// Express quita el prefijo al usar app.use('/api/menu', ...), y según la
// versión de http-proxy-middleware (2.x vs 3.x/4.x) lo restituye o no.
// Usar req.originalUrl hace que funcione igual en cualquier versión.
const proxyA = (target) =>
  createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: (path, req) => req.originalUrl
  });

app.get('/', (req, res) => {
  res.json({
    servicio: 'API Gateway ms.restaurante',
    rutas: ['/api/usuarios', '/api/menu', '/api/pedidos']
  });
});

app.post('/api/usuarios/login', proxyA(MS_USUARIOS_URL));
app.post('/api/usuarios', proxyA(MS_USUARIOS_URL));
app.use('/api/usuarios', validarJWT, soloAdmin, proxyA(MS_USUARIOS_URL));

app.use('/api/menu', validarJWT, (req, res, next) => {
  if (req.method !== 'GET' && req.headers['x-user-rol'] !== 'admin') {
    return res.status(403).json({ error: 'Esta acción requiere permisos de administrador' });
  }
  next();
}, proxyA(MS_MENU_URL));

app.use('/api/pedidos', validarJWT, proxyA(MS_PEDIDOS_URL));

app.listen(PORT, () => {
  console.log(`🚀 API Gateway escuchando en el puerto ${PORT}`);
  console.log(`   usuarios -> ${MS_USUARIOS_URL}`);
  console.log(`   menu     -> ${MS_MENU_URL}`);
  console.log(`   pedidos  -> ${MS_PEDIDOS_URL}`);
});