const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const inventoryController = require('../controllers/inventoryController');

const router = express.Router();

router.use(authMiddleware);
router.get('/', inventoryController.list);
router.post('/', inventoryController.create);
// Before the /:id routes. Guesses the type and quantity from what the user typed.
router.post('/classify', inventoryController.classify);
router.get('/:id', inventoryController.getOne);
router.put('/:id', inventoryController.update);
router.delete('/:id', inventoryController.remove);

module.exports = router;
