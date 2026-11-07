import { useCallback, useEffect, useState } from 'react'
import { getCurrentUser, logoutUser } from '../services/api.js'
import AuthContext from './authContext.js'

export function AuthProvider({ children }) {
  const [session, setSession] = useState({
    user: null,
    status: 'loading',
    error: '',
  })

  useEffect(() => {
    let active = true

    getCurrentUser()
      .then((result) => {
        if (active) {
          setSession({ user: result.user, status: 'authenticated', error: '' })
        }
      })
      .catch((requestError) => {
        if (!active) return

        if (requestError.response?.status === 401) {
          setSession({ user: null, status: 'unauthenticated', error: '' })
          return
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

  const authenticate = useCallback((authenticatedUser) => {
    setSession({ user: authenticatedUser, status: 'authenticated', error: '' })
  }, [])

  const logout = useCallback(async () => {
    await logoutUser()
    setSession({ user: null, status: 'unauthenticated', error: '' })
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

      setSession({
        user: null,
        status: 'error',
        error: 'Unable to verify your session. Check that the API is running and try again.',
      })
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{ ...session, authenticate, logout, refreshSession }}
    >
      {children}
    </AuthContext.Provider>
  )
}
