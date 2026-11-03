const express = require('express');
const {
  collectDefaultMetrics,
  Counter,
  Histogram,
  Registry
} = require('@prometheus-io/client');
const usuarioRoutes = require('./routes/usuario.routes');

const app = express();
const metrics = new Registry();

collectDefaultMetrics({ register: metrics, labels: { service: 'ms-usuarios' } });

const requests = new Counter({
  name: 'http_requests_total',
  help: 'Total de solicitudes HTTP atendidas',
  labelNames: ['service', 'method', 'route', 'status'],
  registers: [metrics]
});
const requestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duración de las solicitudes HTTP en segundos',
  labelNames: ['service', 'method', 'route'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [metrics]
});

function routeLabel(path) {
  const normalizedPath = path.replace(/\/+$/, '');
  if (normalizedPath.endsWith('/login')) return '/api/usuarios/login';
  if (normalizedPath.endsWith('/admin')) return '/api/usuarios/admin';
  if (/\/\d+$/.test(normalizedPath)) return '/api/usuarios/:id';
  if (normalizedPath.endsWith('/usuarios') || normalizedPath === '/') return '/api/usuarios';
  return 'other';
}

app.get('/metrics', async (req, res, next) => {
  try {
    res.set('Content-Type', metrics.contentType);
    res.end(await metrics.metrics());
  } catch (error) {
    next(error);
  }
});

app.use((req, res, next) => {
  const startedAt = process.hrtime.bigint();
  res.on('finish', () => {
    if (req.path === '/metrics') return;

    const labels = {
      service: 'ms-usuarios',
      method: req.method,
      route: routeLabel(req.path)
    };
    requests.inc({ ...labels, status: String(res.statusCode) });
    requestDuration.observe(labels, Number(process.hrtime.bigint() - startedAt) / 1e9);
  });
  next();
});

app.use(express.json());
app.use('/api/usuarios', usuarioRoutes);

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`✅ Microservicio de Usuarios ejecutándose en el puerto ${PORT}`);
});