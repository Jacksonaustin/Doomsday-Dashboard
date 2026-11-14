const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const checklistController = require('../controllers/checklistController');

const router = express.Router();

router.use(authMiddleware);
router.get('/', checklistController.list);
router.post('/', checklistController.add);
router.patch('/:id', checklistController.update);
router.delete('/:id', checklistController.remove);

module.exports = router;
