const jwt = require('jsonwebtoken');
const pedidoRepository = require('../repositories/pedido.repository');

//  Reemplaza por la clave secreta exacta que definió tu compañera en ms.usuarios
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('Falta configurar JWT_SECRET');
}

class PedidoService {
  _validarToken(authHeader) {
    const token = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) {
      const error = new Error('Se requiere un token de autenticación.');
      error.status = 401;
      throw error;
    }

    try {
      return jwt.verify(token, JWT_SECRET);
    } catch {
      const error = new Error('El token es inválido o expiró.');
      error.status = 401;
      throw error;
    }
  }

  _exigirRol(usuario, roles) {
    if (!roles.includes(usuario.rol)) {
      const error = new Error('No tienes permisos para realizar esta acción.');
      error.status = 403;
      throw error;
    }
  }

  async crearPedido(authHeader, datos) {
    const usuario = this._validarToken(authHeader);
    this._exigirRol(usuario, ['admin', 'mesero', 'cliente']);
    const { cliente, items } = datos || {};

    if (
      typeof cliente !== 'string' || !cliente.trim() || cliente.trim().length > 100 ||
      !Array.isArray(items) || items.length === 0
    ) {
      const error = new Error('Indica un cliente o mesa y al menos un producto.');
      error.status = 400;
      throw error;
    }
    const itemsValidos = items.every(
      (item) => item && typeof item === 'object' &&
        Number.isInteger(Number(item.producto_id)) && Number(item.producto_id) > 0 &&
        Number.isInteger(Number(item.cantidad)) && Number(item.cantidad) > 0
    );
    if (!itemsValidos) {
      const error = new Error('Cada producto debe tener un ID y una cantidad entera mayor que cero.');
      error.status = 400;
      throw error;
    }

    const resultado = await pedidoRepository.crearPedido(
      usuario.id,
      cliente.trim(),
      items.map((item) => ({
        producto_id: Number(item.producto_id),
        cantidad: Number(item.cantidad)
      }))
    );
    return { mensaje: 'Pedido creado exitosamente', ...resultado };
  }

  async obtenerTodos(authHeader) {
    const usuario = this._validarToken(authHeader);
    this._exigirRol(usuario, ['admin', 'mesero', 'cocinero', 'cliente']);
    return pedidoRepository.obtenerTodos(usuario.rol === 'cliente' ? usuario.id : null);
  }

  async obtenerPorId(authHeader, id) {
    const usuario = this._validarToken(authHeader);
    this._exigirRol(usuario, ['admin', 'mesero', 'cocinero', 'cliente']);
    const pedido = await pedidoRepository.obtenerPorId(
      id,
      usuario.rol === 'cliente' ? usuario.id : null
    );
    if (!pedido) {
      const error = new Error('Pedido no encontrado.');
      error.status = 404;
      throw error;
    }
    return pedido;
  }

  async actualizarEstado(authHeader, id, estado) {
    const usuario = this._validarToken(authHeader);
    this._exigirRol(usuario, ['admin', 'mesero', 'cocinero']);

    const estadosValidos = ['pendiente', 'en_preparacion', 'servido', 'pagado', 'cancelado'];
    if (!estadosValidos.includes(estado)) {
      const error = new Error('Estado no válido.');
      error.status = 400;
      throw error;
    }

    const actualizado = await pedidoRepository.actualizarEstado(id, estado);
    if (!actualizado) {
      const error = new Error('Pedido no encontrado para actualizar.');
      error.status = 404;
      throw error;
    }

    return { mensaje: `Estado actualizado a '${estado}'` };
  }

  async cancelar(authHeader, id) {
    const usuario = this._validarToken(authHeader);
    this._exigirRol(usuario, ['admin']);
    const eliminado = await pedidoRepository.eliminar(id);
    if (!eliminado) {
      const error = new Error('Pedido no encontrado.');
      error.status = 404;
      throw error;
    }
    return { mensaje: 'Pedido eliminado correctamente' };
  }
}

module.exports = new PedidoService();