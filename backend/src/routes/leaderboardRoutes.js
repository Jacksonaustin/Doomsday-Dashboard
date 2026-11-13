
const express = require('express')
const authMiddleware = require('../middleware/authMiddleware')
const leaderboardController = require('../controllers/leaderboardController')

const router = express.Router()

// Only logged-in users can view the leaderboard
router.use(authMiddleware)

// GET /api/leaderboard
router.get('/', leaderboardController.list)

module.exports = router
