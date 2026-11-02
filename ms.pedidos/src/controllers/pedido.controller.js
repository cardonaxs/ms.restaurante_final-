const pedidoService = require('../services/pedido.service');

class PedidoController {
  async crear(req, res) {
    try {
      const authHeader = req.headers['authorization'];
      const resultado = await pedidoService.crearPedido(authHeader, req.body);
      res.status(201).json(resultado);
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message || 'Error interno del servidor' });
    }
  }

  async obtenerTodos(req, res) {
    try {
      const authHeader = req.headers['authorization'];
      const pedidos = await pedidoService.obtenerTodos(authHeader);
      res.status(200).json(pedidos);
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message || 'Error interno del servidor' });
    }
  }

  async obtenerPorId(req, res) {
    try {
      const authHeader = req.headers['authorization'];
      const pedido = await pedidoService.obtenerPorId(authHeader, req.params.id);
      res.status(200).json(pedido);
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message || 'Error interno del servidor' });
    }
  }

  async actualizarEstado(req, res) {
    try {
      const authHeader = req.headers['authorization'];
      const resultado = await pedidoService.actualizarEstado(authHeader, req.params.id, req.body.estado);
      res.status(200).json(resultado);
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message || 'Error interno del servidor' });
    }
  }

  async cancelar(req, res) {
    try {
      const authHeader = req.headers['authorization'];
      const resultado = await pedidoService.cancelar(authHeader, req.params.id);
      res.status(200).json(resultado);
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message || 'Error interno del servidor' });
    }
  }
}

module.exports = new PedidoController();