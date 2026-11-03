const menuService = require('../services/menu.service');

class MenuController {
  async getCategorias(req, res) {
    try {
      res.json(await menuService.obtenerCategorias());
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async createCategoria(req, res) {
    try {
      res.status(201).json(await menuService.crearCategoria(req.body));
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async getMenu(req, res) {
    try {
      const incluirNoDisponibles =
        req.query.incluirNoDisponibles === 'true' && req.headers['x-user-rol'] === 'admin';
      const menu = await menuService.obtenerMenu(incluirNoDisponibles);
      res.json(menu);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getProductoById(req, res) {
    try {
      const { id } = req.params;
      const producto = await menuService.obtenerProductoPorId(id);
      res.json(producto);
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  }

  async getByCategoria(req, res) {
    try {
      const { categoriaId } = req.params;
      const productos = await menuService.obtenerPorCategoria(categoriaId);
      res.json(productos);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async create(req, res) {
    try {
      const nuevo = await menuService.crearProducto(req.body);
      res.status(201).json(nuevo);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const actualizado = await menuService.actualizarProducto(id, req.body);
      res.json(actualizado);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params;
      await menuService.eliminarProducto(id);
      res.json({ mensaje: 'Producto eliminado del menú' });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
}

module.exports = new MenuController();