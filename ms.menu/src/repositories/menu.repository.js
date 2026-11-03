const { pool } = require('../database');

class MenuRepository {
  async findAllCategories() {
    let conn;
    try {
      conn = await pool.getConnection();
      const [rows] = await conn.query('SELECT id, nombre FROM categorias ORDER BY nombre');
      return rows;
    } finally {
      if (conn) conn.release();
    }
  }

  async findCategoryById(id) {
    let conn;
    try {
      conn = await pool.getConnection();
      const [rows] = await conn.query('SELECT id FROM categorias WHERE id = ?', [id]);
      return rows[0] || null;
    } finally {
      if (conn) conn.release();
    }
  }

  async findCategoryByName(nombre) {
    let conn;
    try {
      conn = await pool.getConnection();
      const [rows] = await conn.query(
        'SELECT id, nombre FROM categorias WHERE nombre = ?',
        [nombre]
      );
      return rows[0] || null;
    } finally {
      if (conn) conn.release();
    }
  }

  async createCategory(nombre) {
    let conn;
    try {
      conn = await pool.getConnection();
      const [result] = await conn.query('INSERT INTO categorias (nombre) VALUES (?)', [nombre]);
      return { id: Number(result.insertId), nombre };
    } finally {
      if (conn) conn.release();
    }
  }

  async findAll(includeUnavailable = false) {
    let conn;
    try {
      conn = await pool.getConnection();
      const query = includeUnavailable
        ? 'SELECT * FROM productos'
        : 'SELECT * FROM productos WHERE disponible = 1';
      const [rows] = await conn.query(query);
      return rows;
    } finally {
      if (conn) conn.release();
    }
  }

  async findById(id) {
    let conn;
    try {
      conn = await pool.getConnection();
      const [rows] = await conn.query('SELECT * FROM productos WHERE id = ?', [id]);
      return rows[0] || null;
    } finally {
      if (conn) conn.release();
    }
  }

  async findByCategoria(categoriaId) {
    let conn;
    try {
      conn = await pool.getConnection();
      const [rows] = await conn.query(
        'SELECT * FROM productos WHERE categoria_id = ? AND disponible = 1',
        [categoriaId]
      );
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
      const [result] = await conn.query(
        'INSERT INTO productos (nombre, descripcion, precio, disponible, categoria_id) VALUES (?, ?, ?, ?, ?)',
        [nombre, descripcion, precio, disponible, categoria_id]
      );
      return { id: Number(result.insertId), ...data };
    } finally {
      if (conn) conn.release();
    }
  }

  async update(id, data) {
    let conn;
    try {
      conn = await pool.getConnection();
      const { nombre, descripcion, precio, disponible, categoria_id } = data;
      await conn.query(
        'UPDATE productos SET nombre = ?, descripcion = ?, precio = ?, disponible = ?, categoria_id = ? WHERE id = ?',
        [nombre, descripcion, precio, disponible, categoria_id, id]
      );
    } finally {
      if (conn) conn.release();
    }
    return this.findById(id);
  }

  async delete(id) {
    let conn;
    try {
      conn = await pool.getConnection();
      const [result] = await conn.query('DELETE FROM productos WHERE id = ?', [id]);
      return result.affectedRows > 0;
    } finally {
      if (conn) conn.release();
    }
  }
}

module.exports = new MenuRepository();