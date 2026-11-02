const { Router } = require('express');
const menuController = require('../controllers/menu.controller');

const router = Router();

router.get('/', (req, res) => menuController.getMenu(req, res));
router.get('/:id', (req, res) => menuController.getProductoById(req, res));
router.get('/categoria/:categoriaId', (req, res) => menuController.getByCategoria(req, res));
router.post('/', (req, res) => menuController.create(req, res));
router.put('/:id', (req, res) => menuController.update(req, res));
router.delete('/:id', (req, res) => menuController.delete(req, res));

module.exports = router;