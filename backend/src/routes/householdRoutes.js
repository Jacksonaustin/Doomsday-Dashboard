const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const householdController = require('../controllers/householdController');

const router = express.Router();

router.use(authMiddleware); // a user can only see and change their own household

router.get('/', householdController.getOne);
router.put('/', householdController.save);

module.exports = router;
