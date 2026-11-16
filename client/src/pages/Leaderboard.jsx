
import { useEffect, useState } from 'react'
import { getLeaderboard, getLeaderboardOptions } from '../services/api.js'

const scenarioLabels = {
  powerOutage: 'Long-Term Power Outage',
  winterStorm: 'Winter Storm',
  tornado: 'Tornado',
  flood: 'Flood'
}

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
const [days, setDays] = useState(null)
const [leaderboardOptions, setLeaderboardOptions] = useState([])
const [selectedScenario, setSelectedScenario] = useState('')




useEffect(() => {
  let active = true

  async function loadOptions() {
    try {
      const response = await getLeaderboardOptions()
      const options = response.data.options

      if (active) {
        setLeaderboardOptions(options)

        if (options.length > 0) {
          setSelectedScenario(options[0].scenario)
          setDays(options[0].days)
        }
      }
    } catch {
      if (active) {
        setError('Unable to load leaderboard options.')
      }
    }
  }

  loadOptions()

  return () => {
    active = false
  }
}, [])




useEffect(() => {
  if (!selectedScenario || days == null) return

  let active = true

  async function loadLeaderboard() {
      setLoading(true)
      setError('')
      setLeaderboard([])
      try {
        const response = await getLeaderboard(selectedScenario, days)

        if (active) {
          setLeaderboard(response.data.leaderboard)
          
        }
      } catch {
        if (active) {
          setError('Unable to load leaderboard.')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadLeaderboard()

    return () => {
      active = false
    }
}, [selectedScenario, days])

  return (
    <main className="min-h-screen bg-[#101713] text-[#eaf2ea]">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-3xl font-bold">
          Preparedness Leaderboard
        </h1>

        <p className="mt-2 text-[#b5c6b7]">
          See how prepared your community is for emergencies.
        </p>

        {days && (
          <p className="mt-1 text-sm text-[#b5c6b7]">
          Ranked by each person's latest {days}-day {scenarioLabels[selectedScenario] || selectedScenario} simulation.
          </p>
        )}

        
      <div className="mt-6 rounded-xl border border-[#304235] bg-[#18231c] p-5">
        <label htmlFor="leaderboard-option" className="block text-sm font-medium">
          Available Leaderboards
        </label>

        <select
          id="leaderboard-option"
          value={selectedScenario && days != null ? `${selectedScenario}|${days}` : ''}
          onChange={(event) => {
            const option = leaderboardOptions.find(
              (item) => `${item.scenario}|${item.days}` === event.target.value
            )

            if (option) {
              setSelectedScenario(option.scenario)
              setDays(option.days)
            }
          }}
          className="mt-2 w-full rounded-md border border-[#405a45] bg-[#101713] px-3 py-2 text-[#eaf2ea]"
        >
          {leaderboardOptions.length === 0 && (
            <option value="">No leaderboards available</option>
          )}


          {leaderboardOptions.map((option) => (
            <option
              key={`${option.scenario}|${option.days}`}
              value={`${option.scenario}|${option.days}`}
            >
              {scenarioLabels[option.scenario] || option.scenario}
              {' — '}
              {option.days} {option.days === 1 ? 'day' : 'days'}
              {' ('}
              {option.participants} {option.participants === 1 ? 'participant' : 'participants'}
              {')'}
            </option>
          ))}

        </select>
      </div>

          



        {loading && <p className="mt-8">Loading leaderboard...</p>}

        {error && (
          <p className="mt-8 text-red-400">{error}</p>
        )}

        {!loading && !error && leaderboard.length === 0 && (
          <p className="mt-8">No simulation scores yet.</p>
        )}

        {!loading && !error && leaderboard.map((user) => (
          <div
            key={user.rank}
            className="mt-4 flex items-center justify-between rounded-lg border border-[#304235] bg-[#18231c] p-4"
          >
            <span>
              #{user.rank} {user.name}
            </span>

            <span className="flex items-baseline gap-4">
              <span className="text-sm text-[#b5c6b7]">
                {user.survivalDays == null
                  ? 'Lasts —'
                  : `Lasts ${user.survivalDays} ${user.survivalDays === 1 ? 'day' : 'days'}`}
              </span>

              <span className="font-semibold text-[#b6db8a]">
                {user.preparednessScore}/100
              </span>
            </span>
          </div>
        ))}
      </div>
    </main>
  )
}
