
const leaderboardServices = require('../services/leaderboardServices')

async function list(req, res, next) {
  try {
    const scenario = req.query.scenario || 'powerOutage'

    const leaderboard = await leaderboardServices.getLeaderboard(scenario)

    res.status(200).json({
      success: true,
      data: { leaderboard },
      message: 'Leaderboard loaded'
    })
  } catch (error) {
    next(error)
  }
}

module.exports = { list }
