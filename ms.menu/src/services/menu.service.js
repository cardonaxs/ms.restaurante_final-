const menuRepository = require('../repositories/menu.repository');

class MenuService {
  async obtenerMenu(incluirNoDisponibles = false) {
    return menuRepository.findAll(incluirNoDisponibles);
  }

  async obtenerCategorias() {
    return menuRepository.findAllCategories();
  }

  async crearCategoria(datos) {
    const nombre = typeof datos?.nombre === 'string' ? datos.nombre.trim() : '';
    if (!nombre || nombre.length > 100) {
      throw new Error('El nombre de la categoría es obligatorio y no debe superar 100 caracteres.');
    }

    if (await menuRepository.findCategoryByName(nombre)) {
      throw new Error('Ya existe una categoría con ese nombre.');
    }

    return menuRepository.createCategory(nombre);
  }

  async obtenerProductoPorId(id) {
    const producto = await menuRepository.findById(id);
    if (!producto) {
      throw new Error('Producto no encontrado en el menú');
    }
    return producto;
  }

  async obtenerPorCategoria(categoriaId) {
    return menuRepository.findByCategoria(categoriaId);
  }

  async crearProducto(datos) {
    return menuRepository.create(await this.validarDatos(datos));
  }

  async actualizarProducto(id, datos) {
    const actual = await this.obtenerProductoPorId(id);
    const datosFinales = await this.validarDatos({ ...actual, ...datos });
    const actualizado = await menuRepository.update(id, datosFinales);
    if (!actualizado) throw new Error('No se pudo actualizar el producto');
    return actualizado;
  }

  async eliminarProducto(id) {
    await this.obtenerProductoPorId(id);
    return await menuRepository.delete(id);
  }

  async validarDatos(datos) {
    const nombre = typeof datos.nombre === 'string' ? datos.nombre.trim() : '';
    const precio = Number(datos.precio);
    const categoriaId =
      datos.categoria_id === '' || datos.categoria_id === undefined ? null : datos.categoria_id;
    const categoriaValida =
      categoriaId === null ||
      (Number.isInteger(Number(categoriaId)) && Number(categoriaId) > 0);

    if (!nombre || !Number.isFinite(precio) || precio < 0 || !categoriaValida) {
      throw new Error('Nombre, precio y categoría deben tener valores válidos.');
    }

    if (categoriaId !== null && !(await menuRepository.findCategoryById(Number(categoriaId)))) {
      throw new Error(`La categoría ${categoriaId} no existe. Actualiza la lista y elige una categoría válida.`);
    }

    return {
      nombre,
      descripcion: typeof datos.descripcion === 'string' ? datos.descripcion.trim() : '',
      precio,
      disponible: datos.disponible === true || Number(datos.disponible) === 1 ? 1 : 0,
      categoria_id: categoriaId === null ? null : Number(categoriaId)
    };
  }
}

module.exports = new MenuService();