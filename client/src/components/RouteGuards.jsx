import { Navigate, useLocation } from 'react-router-dom'
import useAuth from '../context/useAuth.js'

function SessionLoading() {
  return (
    <main className="min-h-screen bg-[#101713] px-6 py-20 text-center text-[#eaf2ea]">
      Checking your session…
    </main>
  )
}

export function ProtectedRoute({ children }) {
  const { user, status, error, refreshSession } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return <SessionLoading />
  }

  if (status === 'error') {
    return (
      <main className="min-h-screen bg-[#101713] px-6 py-20 text-center text-[#eaf2ea]">
        <p role="alert">{error}</p>
        <button className="button button-primary mt-6" onClick={refreshSession}>
          Try again
        </button>
      </main>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return children
}

export function GuestRoute({ children }) {
  const { user, status } = useAuth()

  if (status === 'loading') {
    return <SessionLoading />
  }

  if (user) {
    return <Navigate to="/inventory" replace />
  }

  return children
}
