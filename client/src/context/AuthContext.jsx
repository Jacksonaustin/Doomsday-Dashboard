import { useCallback, useEffect, useState } from 'react'
import { getCurrentUser, logoutUser } from '../services/api.js'
import {
  clearCachedSession,
  getCachedUser,
  saveCachedUser,
  startOfflineSync
} from '../services/offlineData.js'
import AuthContext from './authContext.js'

export function AuthProvider({ children }) {
  const [session, setSession] = useState({
    user: null,
    status: 'loading',
    error: '',
  })
  const [offlineSync, setOfflineSync] = useState({
    online: navigator.onLine,
    pending: 0,
    error: ''
  })

  useEffect(() => {
    let active = true

    getCurrentUser()
      .then((result) => {
        if (active) {
          saveCachedUser(result.user).catch((error) => {
            console.error('Unable to cache the authenticated user for offline use', error)
          })
          setSession({ user: result.user, status: 'authenticated', error: '' })
        }
      })
      .catch(async (requestError) => {
        if (!active) return

        if (requestError.response?.status === 401) {
          setSession({ user: null, status: 'unauthenticated', error: '' })
          return
        }

        try {
          const cachedUser = await getCachedUser()
          if (active && cachedUser) {
            setSession({ user: cachedUser, status: 'authenticated-offline', error: '' })
            return
          }
        } catch (cacheError) {
          console.error('Unable to load the cached user for offline use', cacheError)
        }

        setSession({
          user: null,
          status: 'error',
          error: 'Unable to verify your session. Check that the API is running and try again.',
        })
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!session.user) return undefined

    return startOfflineSync(session.user.id, setOfflineSync)
  }, [session.user])

  const authenticate = useCallback((authenticatedUser) => {
    saveCachedUser(authenticatedUser).catch((error) => {
      console.error('Unable to cache the authenticated user for offline use', error)
    })
    setSession({ user: authenticatedUser, status: 'authenticated', error: '' })
  }, [])

  const logout = useCallback(async () => {
    try {
      await logoutUser()
    } finally {
      await clearCachedSession()
      setOfflineSync({ online: navigator.onLine, pending: 0, error: '' })
      setSession({ user: null, status: 'unauthenticated', error: '' })
    }
  }, [])

  const refreshSession = useCallback(async () => {
    setSession((current) => ({ ...current, status: 'loading', error: '' }))

    try {
      const result = await getCurrentUser()
      setSession({ user: result.user, status: 'authenticated', error: '' })
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        setSession({ user: null, status: 'unauthenticated', error: '' })
        return
      }

      try {
        const cachedUser = await getCachedUser()
        if (cachedUser) {
          setSession({ user: cachedUser, status: 'authenticated-offline', error: '' })
          return
        }
      } catch (cacheError) {
        console.error('Unable to load the cached user for offline use', cacheError)
      }

      setSession({
        user: null,
        status: 'error',
        error: 'Unable to verify your session. Check that the API is running and try again.',
      })
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{ ...session, authenticate, logout, refreshSession, offlineSync }}
    >
      {children}
    </AuthContext.Provider>
  )
}
