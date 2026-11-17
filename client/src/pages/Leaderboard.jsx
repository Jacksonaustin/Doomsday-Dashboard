
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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [optionsError, setOptionsError] = useState('')
const [days, setDays] = useState(null)
const [leaderboardOptions, setLeaderboardOptions] = useState([])
const [selectedScenario, setSelectedScenario] = useState('')
const [view, setView] = useState('mine')
const [searchTerm, setSearchTerm] = useState('')
const [sortBy, setSortBy] = useState('popular')
const [showDetails, setShowDetails] = useState(false)
const [visibleCount, setVisibleCount] = useState(10)

useEffect(() => {
  let active = true

  async function loadOptions() {
    try {
      const response = await getLeaderboardOptions()
      const options = response.data.options

      if (active) {
        setLeaderboardOptions(options)
      }
    } catch {
      if (active) {
        setOptionsError('Unable to load leaderboard options.')
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

  const visibleOptions = leaderboardOptions
    .filter((option) => {
      if (option.participants < 1) return false

      if (view === 'mine' && !option.participated) {
        return false
      }

      const name = scenarioLabels[option.scenario] || option.scenario
      const searchable = `${name} ${option.days} days`.toLowerCase()

      return searchable.includes(searchTerm.toLowerCase().trim())
    })
    .sort((a, b) => {
      if (sortBy === 'popular') {
        return b.participants - a.participants
      }

      const nameA = scenarioLabels[a.scenario] || a.scenario
      const nameB = scenarioLabels[b.scenario] || b.scenario

      return nameA.localeCompare(nameB) || a.days - b.days
    })

  return (
    <main className="min-h-screen bg-[#101713] text-[#eaf2ea]">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-3xl font-bold">
          Preparedness Leaderboard
        </h1>

        <p className="mt-2 text-[#b5c6b7]">
          See how prepared your community is for emergencies.
        </p>

        {showDetails && days != null && (
          <p className="mt-1 text-sm text-[#b5c6b7]">
          Ranked by each person's latest {days}-day {scenarioLabels[selectedScenario] || selectedScenario} simulation.
          </p>
        )}


{!showDetails && (
  <div className="mt-6 rounded-xl border border-[#304235] bg-[#18231c] p-5">
    {optionsError && (
    <p className="mb-4 text-sm text-red-400" role="alert">
      {optionsError}
    </p>
  )}
  {/* Leaderboard tabs */}
  <div className="grid grid-cols-2 gap-2">
    <button
      type="button"
      onClick={() => {
        setView('mine')
        setVisibleCount(10)
      }}
      className={`rounded-md border px-4 py-3 text-sm font-medium ${
        view === 'mine'
          ? 'border-[#81aa69] bg-[#304235] text-[#eaf2ea]'
          : 'border-[#304235] text-[#b5c6b7] hover:bg-[#304235]'
      }`}
    >
      My Leaderboards
    </button>

    <button
      type="button"
      onClick={() => {
        setView('all')
        setVisibleCount(10)
      }}
      className={`rounded-md border px-4 py-3 text-sm font-medium ${
        view === 'all'
          ? 'border-[#81aa69] bg-[#304235] text-[#eaf2ea]'
          : 'border-[#304235] text-[#b5c6b7] hover:bg-[#304235]'
      }`}
    >
      Browse All
    </button>
  </div>

  {/* Search */}
  <input
    type="search"
    placeholder="Search disaster or duration..."
    value={searchTerm}
    onChange={(event) => {
      setSearchTerm(event.target.value)
      setVisibleCount(10)
    }}
    className="mt-4 w-full rounded-md border border-[#405a45] bg-[#101713] px-3 py-2 text-[#eaf2ea]"
  />

  {/* Sort options */}
  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
    <span className="text-sm text-[#b5c6b7]">
      {visibleOptions.length} leaderboards
    </span>

    <select
      value={sortBy}
      onChange={(event) => {
      setSortBy(event.target.value)
      setVisibleCount(10)
    }}
      aria-label="Sort leaderboards"
      className="rounded-md border border-[#405a45] bg-[#101713] px-3 py-2 text-sm"
    >
      <option value="popular">Most Participants</option>
      <option value="name">Disaster Name</option>
    </select>
  </div>

  {/* Leaderboard cards */}
  <div className="mt-4 space-y-3">
    {visibleOptions.length === 0 ? (
      <p className="py-6 text-center text-sm text-[#b5c6b7]">
        {view === 'mine'
          ? 'No matching leaderboards you have participated in.'
          : 'No matching leaderboards found.'}
      </p>
    ) : (
      visibleOptions.slice(0, visibleCount).map((option) => (
        <button
          key={`${option.scenario}|${option.days}`}
          type="button"
          onClick={() => {
            setSelectedScenario(option.scenario)
            setDays(option.days)
            setShowDetails(true)
          }}
          className={`w-full rounded-lg border p-4 text-left transition-colors hover:bg-[#304235] ${
            selectedScenario === option.scenario && days === option.days
              ? 'border-[#81aa69] bg-[#304235]'
              : 'border-[#304235] bg-[#101713]'
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold">
                {scenarioLabels[option.scenario] || option.scenario}
                {' · '}
                {option.days} {option.days === 1 ? 'day' : 'days'}
              </p>

              <p className="mt-1 text-sm text-[#b5c6b7]">
                {option.participants}{' '}
                {option.participants === 1 ? 'participant' : 'participants'}
              </p>
            </div>

            <span className="text-[#b6db8a]">View →</span>
          </div>
        </button>
      ))
    )}
  </div>
    {visibleOptions.length > visibleCount && (
      <button
        type="button"
        onClick={() => setVisibleCount((current) => current + 10)}
        className="mt-4 w-full rounded-md border border-[#405a45] px-4 py-3 text-sm font-medium text-[#b6db8a] hover:bg-[#304235]"
      >
        Show More ({visibleOptions.length - visibleCount} remaining)
      </button>
    )}
</div>
)}
      {showDetails && (
        <section className="mt-6">

          <button
            type="button"
            onClick={() => setShowDetails(false)}
            className="mb-5 rounded-md border border-[#405a45] px-4 py-2 text-sm text-[#b6db8a] hover:bg-[#304235]"
          >
            ← Back to Leaderboards
          </button>

          <h2 className="text-2xl font-semibold">
            {scenarioLabels[selectedScenario] || selectedScenario}
            {' · '}
            {days} {days === 1 ? 'day' : 'days'}
          </h2>



        {loading && <p className="mt-8">Loading leaderboard...</p>}

        {error && (
          <p className="mt-8 text-red-400">{error}</p>
        )}

        {!loading && !error && selectedScenario && days != null && leaderboard.length === 0 && (
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
                ? 'Survival estimate unavailable'
                : `Lasts ${user.survivalDays} ${user.survivalDays === 1 ? 'day' : 'days'}`}
              </span>

              <span className="font-semibold text-[#b6db8a]">
                {user.preparednessScore}/100
              </span>
            </span>
          </div>
        ))}
          </section>
)}
      </div>
    </main>
  )
}
