
import { useEffect, useState } from 'react'
import { getLeaderboard } from '../services/api.js'

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadLeaderboard() {
      try {
        const response = await getLeaderboard('powerOutage')

        if (active) {
          setLeaderboard(response.data.leaderboard)
        }
      } catch (error) {
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
  }, [])

  return (
    <main className="min-h-screen bg-[#101713] text-[#eaf2ea]">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-3xl font-bold">
          Preparedness Leaderboard
        </h1>

        <p className="mt-2 text-[#b5c6b7]">
          See how prepared your community is for emergencies.
        </p>

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

            <span className="font-semibold text-[#b6db8a]">
              {user.preparednessScore}/100
            </span>
          </div>
        ))}
      </div>
    </main>
  )
}
