class Pedido {
  constructor(id, clienteId, mesa, items, total, estado = 'pendiente') {
    this.id = id;
    this.clienteId = clienteId;
    this.mesa = mesa;
    this.items = items; // [{ plato: "Hamburguesa", precio: 15000, cantidad: 2 }]
    this.total = total;
    this.estado = estado; // pendiente, en_preparacion, listo, entregado
    this.fechaCreacion = new Date().toISOString();
  }
}

module.exports = Pedido;