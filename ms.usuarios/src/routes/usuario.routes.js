const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuario.controller');

// Obtener todos los usuarios
router.get('/', usuarioController.obtenerTodos);

// Obtener un usuario por ID
router.get('/:id', usuarioController.obtenerPorId);

// Crear un nuevo usuario
router.post('/', usuarioController.crear);

// Autenticación / Login
router.post('/login', usuarioController.login);

// Actualizar usuario por ID (AGREGADO)
router.put('/:id', usuarioController.actualizar);

// Eliminar usuario por ID (AGREGADO)
router.delete('/:id', usuarioController.eliminar);

module.exports = router;