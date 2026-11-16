
const leaderboardServices = require('../services/leaderboardServices')
const { SCENARIOS } = require('../config/scenarios')

async function list(req, res, next) {
  try {
    const scenario = req.query.scenario || 'powerOutage'
    const days = req.query.days

    const leaderboard = await leaderboardServices.getLeaderboard(scenario, days)

res.status(200).json({
  success: true,
  data: {
    leaderboard,
    scenario,
    days: days == null ? SCENARIOS[scenario].days : Number(days)
  },
  message: 'Leaderboard loaded'
})
  } catch (error) {
    next(error)
  }
}
async function options(req, res, next) {
  try {
    const results = await leaderboardServices.getLeaderboardOptions()

    const options = results.map((result) => ({
      scenario: result._id.scenario,
      days: result._id.days,
      participants: result.participants
    }))

    res.status(200).json({
      success: true,
      data: { options },
      message: 'Leaderboard options loaded'
    })
  } catch (error) {
    next(error)
  }
}

module.exports = { list, options }