const pool = require('../database');

class PedidoRepository {
  async crearPedido(usuarioId, cliente, total) {
    let conn;
    try {
      conn = await pool.getConnection();
      const res = await conn.query(
        'INSERT INTO pedidos (usuario_id, cliente, total) VALUES (?, ?, ?)',
        [usuarioId, cliente, total]
      );
      return Number(res.insertId);
    } finally {
      if (conn) conn.release();
    }
  }

  async crearDetalles(pedidoId, items) {
    let conn;
    try {
      conn = await pool.getConnection();
      for (const item of items) {
        const subtotal = item.cantidad * item.precio_unitario;
        // 🔧 Corregido: El orden coincide con tus columnas en phpMyAdmin: 
        // (pedido_id, producto_id, precio_unitario, cantidad, subtotal)
        await conn.query(
          'INSERT INTO detalle_pedidos (pedido_id, producto_id, precio_unitario, cantidad, subtotal) VALUES (?, ?, ?, ?, ?)',
          [pedidoId, item.producto_id, item.precio_unitario, item.cantidad, subtotal]
        );
      }
    } finally {
      if (conn) conn.release();
    }
  }

  async obtenerTodos() {
    let conn;
    try {
      conn = await pool.getConnection();
      // 🔧 Corregido: Se cambió creado_en por created_at
      return await conn.query('SELECT * FROM pedidos ORDER BY created_at DESC');
    } finally {
      if (conn) conn.release();
    }
  }

  async obtenerPorId(id) {
    let conn;
    try {
      conn = await pool.getConnection();
      const pedidos = await conn.query('SELECT * FROM pedidos WHERE id = ?', [id]);
      if (pedidos.length === 0) return null;

      const detalles = await conn.query('SELECT * FROM detalle_pedidos WHERE pedido_id = ?', [id]);
      return { ...pedidos[0], detalles };
    } finally {
      if (conn) conn.release();
    }
  }

  async actualizarEstado(id, nuevoEstado) {
    let conn;
    try {
      conn = await pool.getConnection();
      const res = await conn.query(
        'UPDATE pedidos SET estado = ? WHERE id = ?',
        [nuevoEstado, id]
      );
      return res.affectedRows > 0;
    } finally {
      if (conn) conn.release();
    }
  }

  async eliminar(id) {
    let conn;
    try {
      conn = await pool.getConnection();
      const res = await conn.query('DELETE FROM pedidos WHERE id = ?', [id]);
      return res.affectedRows > 0;
    } finally {
      if (conn) conn.release();
    }
  }
}

module.exports = new PedidoRepository();