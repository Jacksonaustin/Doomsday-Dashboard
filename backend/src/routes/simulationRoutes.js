const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const simulationController = require('../controllers/simulationController');

const router = express.Router();

router.use(authMiddleware); // every simulation route requires login

router.get('/scenarios', simulationController.scenarios); // must come before /:id
router.post('/', simulationController.run);
router.get('/', simulationController.list);
router.get('/:id', simulationController.getOne);

module.exports = router;
