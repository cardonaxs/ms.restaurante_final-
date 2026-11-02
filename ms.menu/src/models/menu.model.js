class Menu {
  constructor({ id, nombre, descripcion, precio, disponible, categoria_id }) {
    this.id = id;
    this.nombre = nombre;
    this.descripcion = descripcion || '';
    this.precio = Number(precio);
    this.disponible = disponible === 1 || disponible === true;
    this.categoria_id = categoria_id ? Number(categoria_id) : null;
  }
}

module.exports = Menu;