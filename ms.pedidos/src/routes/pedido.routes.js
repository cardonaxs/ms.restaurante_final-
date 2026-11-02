const { Router } = require('express');
const pedidoController = require('../controllers/pedido.controller');

const router = Router();

router.post('/', (req, res) => pedidoController.crear(req, res));
router.get('/', (req, res) => pedidoController.obtenerTodos(req, res));
router.get('/:id', (req, res) => pedidoController.obtenerPorId(req, res));
router.patch('/:id/estado', (req, res) => pedidoController.actualizarEstado(req, res));
router.delete('/:id', (req, res) => pedidoController.cancelar(req, res));

module.exports = router;