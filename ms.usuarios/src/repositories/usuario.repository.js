const { pool } = require('../database');
const Usuario = require('../models/usuario.model');

class UsuarioRepository {
  async obtenerTodos() {
    let conn;
    try {
      conn = await pool.getConnection();
      const rows = await conn.query('SELECT id, nombre, email, rol, created_at FROM usuarios');
      return rows;
    } finally {
      if (conn) conn.release();
    }
  }

  async obtenerPorId(id) {
    let conn;
    try {
      conn = await pool.getConnection();
      const rows = await conn.query('SELECT id, nombre, email, rol, created_at FROM usuarios WHERE id = ?', [id]);
      return rows[0] || null;
    } finally {
      if (conn) conn.release();
    }
  }

  async buscarPorEmail(email) {
    let conn;
    try {
      conn = await pool.getConnection();
      const rows = await conn.query('SELECT * FROM usuarios WHERE email = ?', [email]);
      return rows[0] || null;
    } finally {
      if (conn) conn.release();
    }
  }

  async crear(usuarioData) {
    let conn;
    try {
      conn = await pool.getConnection();
      const result = await conn.query(
        'INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, ?)',
        [usuarioData.nombre, usuarioData.email, usuarioData.password, usuarioData.rol]
      );
      return { id: Number(result.insertId), ...usuarioData };
    } finally {
      if (conn) conn.release();
    }
  }

  async actualizar(id, usuarioData) {
    let conn;
    try {
      conn = await pool.getConnection();
      const result = await conn.query(
        'UPDATE usuarios SET nombre = ?, email = ?, rol = ? WHERE id = ?',
        [usuarioData.nombre, usuarioData.email, usuarioData.rol, id]
      );
      return result.affectedRows > 0;
    } finally {
      if (conn) conn.release();
    }
  }

  async eliminar(id) {
    let conn;
    try {
      conn = await pool.getConnection();
      const result = await conn.query('DELETE FROM usuarios WHERE id = ?', [id]);
      return result.affectedRows > 0;
    } finally {
      if (conn) conn.release();
    }
  }
}

module.exports = new UsuarioRepository();