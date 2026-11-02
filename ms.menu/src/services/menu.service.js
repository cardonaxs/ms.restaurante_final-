const menuRepository = require('../repositories/menu.repository');

class MenuService {
  async obtenerMenu() {
    return await menuRepository.findAll();
  }

  async obtenerProductoPorId(id) {
    const producto = await menuRepository.findById(id);
    if (!producto) {
      throw new Error('Producto no encontrado en el menú');
    }
    return producto;
  }

  async obtenerPorCategoria(categoriaId) {
    return await menuRepository.findByCategoria(categoriaId);
  }

  async crearProducto(datos) {
    if (!datos.nombre || !datos.precio) {
      throw new Error('El nombre y el precio son obligatorios');
    }
    return await menuRepository.create(datos);
  }

  async actualizarProducto(id, datos) {
    await this.obtenerProductoPorId(id);
    return await menuRepository.update(id, datos);
  }

  async eliminarProducto(id) {
    await this.obtenerProductoPorId(id);
    return await menuRepository.delete(id);
  }
}

module.exports = new MenuService();