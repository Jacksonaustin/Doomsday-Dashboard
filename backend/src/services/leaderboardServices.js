
const SimulationResult = require('../models/simulationResults')
const { SCENARIOS } = require('../config/scenarios')
const httpError = require('../utils/httpError')

async function getLeaderboard(scenario = 'powerOutage') {
  // Only allow scenarios defined by our backend
  if (!Object.hasOwn(SCENARIOS, scenario)) {
    throw httpError(400, 'Invalid disaster scenario')
  }

  const results = await SimulationResult.aggregate([
    // Only compare the same disaster scenario
    { $match: { scenario } },

    // Newest simulations first
    { $sort: { createdAt: -1, _id: -1 } },

    // Keep each user's most recent result
    {
      $group: {
        _id: '$userId',
        latest: { $first: '$$ROOT' }
      }
    },

    // Find the user's account name
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user'
      }
    },

    { $unwind: '$user' },

    // Return only the fields needed for the leaderboard
    {
      $project: {
        _id: 0,
        name: '$user.name',
        preparednessScore: '$latest.preparednessScore',
        scenario: '$latest.scenario',
        createdAt: '$latest.createdAt'
      }
    },

    // Highest current score ranks first
    { $sort: { preparednessScore: -1, createdAt: -1 } },

    // Show up to 50 participants
    { $limit: 50 }
  ])

  return results.map((result, index) => ({
    rank: index + 1,
    ...result
  }))
}

module.exports = { getLeaderboard }
