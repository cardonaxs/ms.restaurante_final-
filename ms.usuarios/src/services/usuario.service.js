const usuarioRepository = require('../repositories/usuario.repository');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('Falta configurar JWT_SECRET');
}

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
    const { nombre, email, password, rol } = datosUsuario || {};
    const correo = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (
      typeof nombre !== 'string' || !nombre.trim() ||
      nombre.trim().length > 100 ||
      correo.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) ||
      typeof password !== 'string' || password.length < 6
    ) {
      throw new Error('Ingresa un nombre, correo válido y una contraseña de al menos 6 caracteres.');
    }
    if (!['cliente', 'mesero', 'cocinero', 'admin'].includes(rol)) {
      throw new Error('El rol indicado no es válido.');
    }

    const usuarioExistente = await usuarioRepository.buscarPorEmail(correo);
    if (usuarioExistente) {
      throw new Error('El correo electrónico ya está registrado.');
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const nuevoUsuarioData = {
      nombre,
      email: correo,
      password: hashedPassword,
      rol
    };

    return await usuarioRepository.crear(nuevoUsuarioData);
  }

  // Método para actualizar un usuario por ID
  async actualizarUsuario(id, datosActualizados) {
    const usuario = await usuarioRepository.obtenerPorId(id);
    if (!usuario) {
      throw new Error('Usuario no encontrado.');
    }

    const datos = datosActualizados || {};
    const datosFinales = { nombre: usuario.nombre, email: usuario.email, rol: usuario.rol };
    if (datos.nombre !== undefined) {
      if (typeof datos.nombre !== 'string' || !datos.nombre.trim() || datos.nombre.trim().length > 100) {
        throw new Error('El nombre indicado no es válido.');
      }
      datosFinales.nombre = datos.nombre.trim();
    }
    if (datos.email !== undefined) {
      if (typeof datos.email !== 'string') throw new Error('El correo indicado no es válido.');
      const email = datos.email.trim().toLowerCase();
      if (email.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error('El correo indicado no es válido.');
      }
      if (email !== usuario.email && await usuarioRepository.buscarPorEmail(email)) {
        throw new Error('El correo electrónico ya está registrado.');
      }
      datosFinales.email = email;
    }
    if (datos.rol !== undefined) datosFinales.rol = datos.rol;
    if (!['cliente', 'mesero', 'cocinero', 'admin'].includes(datosFinales.rol)) {
      throw new Error('El rol indicado no es válido.');
    }

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
    if (typeof email !== 'string' || !email.trim() || typeof password !== 'string' || !password) {
      throw new Error('Debes proporcionar email y contraseña.');
    }

    const usuario = await usuarioRepository.buscarPorEmail(email.trim().toLowerCase());
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