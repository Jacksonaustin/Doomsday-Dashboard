import { useCallback, useEffect, useState } from 'react'
import { getCurrentUser, logoutUser } from '../services/api.js'
import {
  clearCachedSession,
  clearLogoutPending,
  getCachedUser,
  isLogoutPending,
  markLogoutPending,
  saveCachedUser,
  startOfflineSync
} from '../services/offlineData.js'
import AuthContext from './authContext.js'

const SIGNED_OUT = { user: null, status: 'unauthenticated', error: '' }
const EMPTY_SYNC = { pending: 0, failedItems: [], error: '', authExpired: false }

function cacheUser(user) {
  saveCachedUser(user).catch((error) => {
    console.error('Unable to cache the authenticated user for offline use', error)
  })
}

// Asks the server who is signed in, and falls back to the cached user when the
// server can't be reached.
async function resolveSession() {
  try {
    const result = await getCurrentUser()
    cacheUser(result.user)
    return { user: result.user, status: 'authenticated', error: '' }
  } catch (requestError) {
    if (requestError.response?.status === 401) return SIGNED_OUT

    try {
      const cachedUser = await getCachedUser()
      if (cachedUser) {
        return { user: cachedUser, status: 'authenticated-offline', error: '' }
      }
    } catch (cacheError) {
      console.error('Unable to load the cached user for offline use', cacheError)
    }

    return {
      user: null,
      status: 'error',
      error: 'Unable to verify your session. Check that the API is running and try again.',
    }
  }
}

// A sign-out that couldn't reach the server leaves the session cookie valid.
// Finish it before trusting that cookie again. Returns true if one was pending.
async function finishPendingLogout() {
  if (!(await isLogoutPending().catch(() => false))) return false

  try {
    await logoutUser()
    await clearLogoutPending()
  } catch (error) {
    // The server answered, so there's nothing more to retry. With no answer we
    // stay signed out and try again on the next load.
    if (error.response) await clearLogoutPending().catch(() => {})
  }
  return true
}

async function initialSession() {
  if (await finishPendingLogout()) return SIGNED_OUT
  return resolveSession()
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState({
    user: null,
    status: 'loading',
    error: '',
  })
  const [offlineSync, setOfflineSync] = useState({
    online: navigator.onLine,
    ...EMPTY_SYNC
  })

  useEffect(() => {
    let active = true

    initialSession().then((nextSession) => {
      if (active) setSession(nextSession)
    })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!session.user) return undefined

    return startOfflineSync(session.user.id, (syncStatus) => {
      setOfflineSync(syncStatus)
      if (syncStatus.authExpired) {
        // Queued changes stay on the device and sync after the user signs back in.
        clearCachedSession().catch(() => {})
        setSession(SIGNED_OUT)
      }
    })
  }, [session.user])

  const authenticate = useCallback((authenticatedUser) => {
    clearLogoutPending().catch(() => {})
    cacheUser(authenticatedUser)
    setSession({ user: authenticatedUser, status: 'authenticated', error: '' })
  }, [])

  const logout = useCallback(async () => {
    try {
      await logoutUser()
    } catch {
      // Offline or the server failed: finish signing out on the next load.
      await markLogoutPending().catch(() => {})
    }

    await clearCachedSession().catch(() => {})
    setOfflineSync({ online: navigator.onLine, ...EMPTY_SYNC })
    setSession(SIGNED_OUT)
  }, [])

  const refreshSession = useCallback(async () => {
    setSession((current) => ({ ...current, status: 'loading', error: '' }))
    setSession(await resolveSession())
  }, [])

  return (
    <AuthContext.Provider
      value={{ ...session, authenticate, logout, refreshSession, offlineSync }}
    >
      {children}
    </AuthContext.Provider>
  )
}