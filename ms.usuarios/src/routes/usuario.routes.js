const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuario.controller');
const { validarJWT, soloAdmin } = require('../middleware/auth.middleware');

router.post('/login', usuarioController.login);
router.post('/', usuarioController.crear);

router.post('/admin', validarJWT, soloAdmin, usuarioController.crearAdmin);
router.get('/', validarJWT, soloAdmin, usuarioController.obtenerTodos);
router.get('/:id', validarJWT, soloAdmin, usuarioController.obtenerPorId);
router.put('/:id', validarJWT, soloAdmin, usuarioController.actualizar);
router.delete('/:id', validarJWT, soloAdmin, usuarioController.eliminar);

module.exports = router;