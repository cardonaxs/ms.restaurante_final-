const jwt = require('jsonwebtoken');
const pedidoRepository = require('../repositories/pedido.repository');

//  Reemplaza por la clave secreta exacta que definió tu compañera en ms.usuarios
const JWT_SECRET = process.env.JWT_SECRET || 'clave_secreta_del_proyecto';

class PedidoService {
  // Función interna para verificar que el token recibido exista y sea legítimo
  _validarToken(authHeader) {
    if (!authHeader) {
      throw { status: 401, message: 'Acceso denegado. No se proporcionó Token JWT' };
    }

    const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;

    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      throw { status: 403, message: 'Token JWT inválido o expirado' };
    }
  }

  async crearPedido(authHeader, datos) {
    const usuario = this._validarToken(authHeader);
    const { cliente, items } = datos;

    if (!cliente || !items || !Array.isArray(items) || items.length === 0) {
      throw { status: 400, message: 'Faltan datos requeridos (cliente e items)' };
    }

    // Cálculo del total
    const total = items.reduce((sum, item) => sum + (item.cantidad * item.precio_unitario), 0);

    // Guardar cabecera y detalle
    const pedidoId = await pedidoRepository.crearPedido(usuario.id, cliente, total);
    await pedidoRepository.crearDetalles(pedidoId, items);

    return { mensaje: 'Pedido creado exitosamente', pedido_id: pedidoId, total };
  }

  async obtenerTodos(authHeader) {
    this._validarToken(authHeader);
    return await pedidoRepository.obtenerTodos();
  }

  async obtenerPorId(authHeader, id) {
    this._validarToken(authHeader);
    const pedido = await pedidoRepository.obtenerPorId(id);
    if (!pedido) {
      throw { status: 404, message: 'Pedido no encontrado' };
    }
    return pedido;
  }

  async actualizarEstado(authHeader, id, estado) {
    this._validarToken(authHeader);

    const estadosValidos = ['pendiente', 'en_preparacion', 'servido', 'cancelado'];
    if (!estadosValidos.includes(estado)) {
      throw { status: 400, message: 'Estado no válido' };
    }

    const actualizado = await pedidoRepository.actualizarEstado(id, estado);
    if (!actualizado) {
      throw { status: 404, message: 'Pedido no encontrado para actualizar' };
    }

    return { mensaje: `Estado actualizado a '${estado}'` };
  }

  async cancelar(authHeader, id) {
    this._validarToken(authHeader);
    const eliminado = await pedidoRepository.eliminar(id);
    if (!eliminado) {
      throw { status: 404, message: 'Pedido no encontrado' };
    }
    return { mensaje: 'Pedido eliminado correctamente' };
  }
}

module.exports = new PedidoService();