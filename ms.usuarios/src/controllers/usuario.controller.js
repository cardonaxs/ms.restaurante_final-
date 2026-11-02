const usuarioService = require('../services/usuario.service');

class UsuarioController {
  async obtenerTodos(req, res) {
    try {
      const usuarios = await usuarioService.obtenerTodos();
      res.status(200).json(usuarios);
    } catch (error) {
      res.status(500).json({ mensaje: error.message });
    }
  }

  async obtenerPorId(req, res) {
    try {
      const usuario = await usuarioService.obtenerPorId(req.params.id);
      res.status(200).json(usuario);
    } catch (error) {
      res.status(404).json({ mensaje: error.message });
    }
  }

  async crear(req, res) {
    try {
      const nuevoUsuario = await usuarioService.crearUsuario(req.body);
      res.status(201).json(nuevoUsuario);
    } catch (error) {
      res.status(400).json({ mensaje: error.message });
    }
  }

  // Método para actualizar usuario (AGREGADO)
  async actualizar(req, res) {
    try {
      const usuarioActualizado = await usuarioService.actualizarUsuario(req.params.id, req.body);
      res.status(200).json({ mensaje: 'Usuario actualizado con éxito', usuario: usuarioActualizado });
    } catch (error) {
      res.status(400).json({ mensaje: error.message });
    }
  }

  // Método para eliminar usuario (AGREGADO)
  async eliminar(req, res) {
    try {
      await usuarioService.eliminarUsuario(req.params.id);
      res.status(200).json({ mensaje: 'Usuario eliminado con éxito' });
    } catch (error) {
      res.status(400).json({ mensaje: error.message });
    }
  }

  async login(req, res) {
    try {
      const { email, password } = req.body;
      const respuesta = await usuarioService.login(email, password);
      res.status(200).json(respuesta);
    } catch (error) {
      res.status(401).json({ mensaje: error.message });
    }
  }
}

module.exports = new UsuarioController();