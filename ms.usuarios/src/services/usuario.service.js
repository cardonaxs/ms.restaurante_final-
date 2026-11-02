const usuarioRepository = require('../repositories/usuario.repository');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'clave_secreta_del_proyecto';

class UsuarioService {
  // Método para obtener todos los usuarios
  async obtenerTodos() {
    return await usuarioRepository.obtenerTodos();
  }

  // Método para obtener un usuario por ID
  async obtenerPorId(id) {
    const usuario = await usuarioRepository.obtenerPorId(id);
    if (!usuario) {
      throw new Error('Usuario no encontrado.');
    }
    return usuario;
  }

  // Método crearUsuario
  async crearUsuario(datosUsuario) {
    const { nombre, email, password, rol } = datosUsuario;

    if (!nombre || !email || !password) {
      throw new Error('El nombre, email y contraseña son obligatorios.');
    }

    const usuarioExistente = await usuarioRepository.buscarPorEmail(email);
    if (usuarioExistente) {
      throw new Error('El correo electrónico ya está registrado.');
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const nuevoUsuarioData = {
      nombre,
      email,
      password: hashedPassword,
      rol: rol || 'mesero'
    };

    return await usuarioRepository.crear(nuevoUsuarioData);
  }

  // Método para actualizar un usuario por ID
  async actualizarUsuario(id, datosActualizados) {
    const usuario = await usuarioRepository.obtenerPorId(id);
    if (!usuario) {
      throw new Error('Usuario no encontrado.');
    }

    const datosFinales = {
      nombre: datosActualizados.nombre || usuario.nombre,
      email: datosActualizados.email || usuario.email,
      rol: datosActualizados.rol || usuario.rol
    };

    await usuarioRepository.actualizar(id, datosFinales);
    return await usuarioRepository.obtenerPorId(id);
  }

  // Método para eliminar un usuario por ID
  async eliminarUsuario(id) {
    const usuario = await usuarioRepository.obtenerPorId(id);
    if (!usuario) {
      throw new Error('Usuario no encontrado.');
    }
    return await usuarioRepository.eliminar(id);
  }

  // Método login
  async login(email, password) {
    if (!email || !password) {
      throw new Error('Debes proporcionar email y contraseña.');
    }

    const usuario = await usuarioRepository.buscarPorEmail(email);
    if (!usuario) {
      throw new Error('Credenciales inválidas.');
    }

    const esValida = await bcrypt.compare(password, usuario.password);
    if (!esValida) {
      throw new Error('Credenciales inválidas.');
    }

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, rol: usuario.rol },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    return {
      mensaje: 'Autenticación exitosa',
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol
      }
    };
  }
}

module.exports = new UsuarioService();