const { pool } = require('../database');
const Menu = require('../models/menu.model');

class MenuRepository {
  async findAll() {
    let conn;
    try {
      conn = await pool.getConnection();
      const rows = await conn.query('SELECT * FROM productos WHERE disponible = 1');
      return rows;
    } finally {
      if (conn) conn.release();
    }
  }

  async findById(id) {
    let conn;
    try {
      conn = await pool.getConnection();
      const rows = await conn.query('SELECT * FROM productos WHERE id = ?', [id]);
      return rows[0] || null;
    } finally {
      if (conn) conn.release();
    }
  }

  async findByCategoria(categoriaId) {
    let conn;
    try {
      conn = await pool.getConnection();
      const rows = await conn.query('SELECT * FROM productos WHERE categoria_id = ? AND disponible = 1', [categoriaId]);
      return rows;
    } finally {
      if (conn) conn.release();
    }
  }

  async create(data) {
    let conn;
    try {
      conn = await pool.getConnection();
      const { nombre, descripcion, precio, disponible = 1, categoria_id } = data;
      const res = await conn.query(
        'INSERT INTO productos (nombre, descripcion, precio, disponible, categoria_id) VALUES (?, ?, ?, ?, ?)',
        [nombre, descripcion, precio, disponible, categoria_id]
      );
      return { id: Number(res.insertId), ...data };
    } finally {
      if (conn) conn.release();
    }
  }

  async update(id, data) {
    let conn;
    try {
      conn = await pool.getConnection();
      const { nombre, descripcion, precio, disponible, categoria_id } = data;
      const res = await conn.query(
        'UPDATE productos SET nombre = ?, descripcion = ?, precio = ?, disponible = ?, categoria_id = ? WHERE id = ?',
        [nombre, descripcion, precio, disponible, categoria_id, id]
      );
      return res.affectedRows > 0 ? await this.findById(id) : null;
    } finally {
      if (conn) conn.release();
    }
  }

  async delete(id) {
    let conn;
    try {
      conn = await pool.getConnection();
      const res = await conn.query('DELETE FROM productos WHERE id = ?', [id]);
      return res.affectedRows > 0;
    } finally {
      if (conn) conn.release();
    }
  }
}

module.exports = new MenuRepository();