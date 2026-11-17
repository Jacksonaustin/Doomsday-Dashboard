
const SimulationResult = require('../models/simulationResults')
const { SCENARIOS } = require('../config/scenarios')
const httpError = require('../utils/httpError')

async function getLeaderboard(scenario = 'powerOutage', days) {
  // Only allow scenarios defined by our backend
  if (!Object.hasOwn(SCENARIOS, scenario)) {
    throw httpError(400, 'Invalid disaster scenario')
  }
  const selectedDays = days == null ? SCENARIOS[scenario].days : Number(days)

if (!Number.isInteger(selectedDays) || selectedDays < 1 || selectedDays > 365) {
  throw httpError(400, 'Duration must be between 1 and 365 days')
}

  const results = await SimulationResult.aggregate([
    // Only compare the same disaster scenario
    // Only standard-length runs are comparable. Older results have no days field.
    {
      $match: {
        scenario,
        days: selectedDays === SCENARIOS[scenario].days
          ? { $in: [selectedDays, null] }
          : selectedDays
      }
    },

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
        // Older results have no survival estimate, so this can be null.
        survivalDays: { $ifNull: ['$latest.survival.days', null] },
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


async function getLeaderboardOptions(userId) {
  const results = await SimulationResult.aggregate([

    {
      $project: {
        userId: 1,
        scenario: 1,
        days: {
          $ifNull: [
            '$days',
            {
              $switch: {
                branches: Object.entries(SCENARIOS).map(([key, config]) => ({
                  case: { $eq: ['$scenario', key] },
                  then: config.days
                })),
                default: null
              }
            }
          ]
        }
      }
    },

    {
      $group: {
        _id: {
          scenario: '$scenario',
          days: '$days',
          userId: '$userId'
        }
      }
    },
  {
    $group: {
      _id: {
        scenario: '$_id.scenario',
        days: '$_id.days'
      },
      participants: { $sum: 1 },
      myParticipation: {
        $sum: {
          $cond: [
            { $eq: [{ $toString: '$_id.userId' }, userId] },
            1,
            0
          ]
        }
      }
    }
  },
    {
      $sort: {
        '_id.scenario': 1,
        '_id.days': 1
      }
    }
  ])

  return results
}


module.exports = { getLeaderboard, getLeaderboardOptions }
