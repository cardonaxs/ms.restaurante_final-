const pool = require('../database');

class PedidoRepository {
  async crearPedido(usuarioId, cliente, items) {
    let conn;
    try {
      conn = await pool.getConnection();
      await conn.beginTransaction();

      let totalCentavos = 0;
      const lineas = [];
      for (const item of items) {
        const productos = await conn.query(
          'SELECT precio, disponible FROM productos WHERE id = ?',
          [item.producto_id]
        );
        const producto = productos[0];
        if (!producto || Number(producto.disponible) !== 1) {
          const error = new Error(`El producto ${item.producto_id} no existe o no está disponible.`);
          error.status = 400;
          throw error;
        }

        const precioCentavos = Math.round(Number(producto.precio) * 100);
        totalCentavos += precioCentavos * item.cantidad;
        lineas.push({ ...item, precioCentavos });
      }

      const total = (totalCentavos / 100).toFixed(2);
      const pedido = await conn.query(
        'INSERT INTO pedidos (usuario_id, cliente, total) VALUES (?, ?, ?)',
        [usuarioId, cliente, total]
      );
      const pedidoId = Number(pedido.insertId);

      for (const item of lineas) {
        await conn.query(
          'INSERT INTO detalle_pedidos (pedido_id, producto_id, precio_unitario, cantidad) VALUES (?, ?, ?, ?)',
          [pedidoId, item.producto_id, (item.precioCentavos / 100).toFixed(2), item.cantidad]
        );
      }

      await conn.commit();
      return { pedido_id: pedidoId, total: Number(total) };
    } catch (error) {
      if (conn) await conn.rollback();
      throw error;
    } finally {
      if (conn) conn.release();
    }
  }

  async obtenerTodos(usuarioId = null) {
    let conn;
    try {
      conn = await pool.getConnection();
      if (usuarioId) {
        return await conn.query(
          'SELECT * FROM pedidos WHERE usuario_id = ? ORDER BY created_at DESC',
          [usuarioId]
        );
      }
      return await conn.query('SELECT * FROM pedidos ORDER BY created_at DESC');
    } finally {
      if (conn) conn.release();
    }
  }

  async obtenerPorId(id, usuarioId = null) {
    let conn;
    try {
      conn = await pool.getConnection();
      const pedidos = usuarioId
        ? await conn.query('SELECT * FROM pedidos WHERE id = ? AND usuario_id = ?', [id, usuarioId])
        : await conn.query('SELECT * FROM pedidos WHERE id = ?', [id]);
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