
const leaderboardServices = require('../services/leaderboardServices')
const { SCENARIOS } = require('../config/scenarios')

async function list(req, res, next) {
  try {
    const scenario = req.query.scenario || 'powerOutage'

    const leaderboard = await leaderboardServices.getLeaderboard(scenario)

    res.status(200).json({
      success: true,
      // days: the standard length every ranked result was run at
      data: { leaderboard, scenario, days: SCENARIOS[scenario].days },
      message: 'Leaderboard loaded'
    })
  } catch (error) {
    next(error)
  }
}

module.exports = { list }
