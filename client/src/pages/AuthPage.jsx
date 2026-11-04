import { useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../components/Icon.jsx'
import { loginUser, registerUser } from '../services/api.js'

function getErrorMessage(error) {
  if (!error.response) {
    return 'Unable to reach the API. Make sure the backend is running.'
  }

  if (error.response.status === 404) {
    return 'Authentication is not connected yet. The backend still needs these routes.'
  }

  return error.response.data?.message || 'Something went wrong. Please try again.'
}

export default function AuthPage({ mode }) {
  const isRegister = mode === 'register'

  const [values, setValues] = useState({
    name: '',
    email: '',
    password: '',
    confirm: '',
  })
  const [visible, setVisible] = useState(false)
  const [pending, setPending] = useState(false)
  const [notice, setNotice] = useState(null)

  function update(field, value) {
    setValues((current) => ({ ...current, [field]: value }))
    setNotice(null)
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const email = values.email.trim()

    // Validate on the client for immediate feedback. The API must validate too.
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setNotice({ type: 'error', message: 'Enter a valid email address.' })
      return
    }

    if (values.password.length < 8) {
      setNotice({ type: 'error', message: 'Password must be at least 8 characters.' })
      return
    }

    if (isRegister && !values.name.trim()) {
      setNotice({ type: 'error', message: 'Please enter your name.' })
      return
    }

    if (isRegister && values.password !== values.confirm) {
      setNotice({ type: 'error', message: 'Your passwords do not match.' })
      return
    }

    setPending(true)
    setNotice(null)

    try {
      const result = isRegister
        ? await registerUser({
            name: values.name.trim(),
            email,
            password: values.password,
          })
        : await loginUser({ email, password: values.password })

      if (result?.success === false) {
        throw new Error(result.message || 'The request was not accepted.')
      }

      // The backend doesn't handle sessions yet, so don't claim the user is logged in.
      setNotice({
        type: 'success',
        message: isRegister
          ? 'Registration request was accepted by the API.'
          : 'Login request was accepted by the API. Session handling is the next integration step.',
      })
    } catch (error) {
      setNotice({
        type: 'error',
        message: error.response
          ? getErrorMessage(error)
          : error.message && !error.isAxiosError
            ? error.message
            : getErrorMessage(error),
      })
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="auth-main">
      <div className="auth-grid-pattern" aria-hidden="true" />

      <div className="page-container auth-layout">
        <div className="auth-story">
          <div className="eyebrow">
            <span className="eyebrow-line" />
            ACCESS YOUR PREPAREDNESS SYSTEM
          </div>

          <h1>
            PREPARATION
            <br />
            IS A <span>CHOICE.</span>
          </h1>

          <p>
            Your command center for tracking supplies, planning scenarios, and making
            smarter preparedness decisions.
          </p>

          <div className="auth-story-line" />
          <div className="auth-points">
            <div>
              <Icon name="check" size={18} />
              Organize your household's inventory
            </div>
            <div>
              <Icon name="check" size={18} />
              Monitor estimated resource coverage
            </div>
            <div>
              <Icon name="check" size={18} />
              Identify what to improve next
            </div>
          </div>

          <div className="auth-story-footer">
            DOOMSDAY DASHBOARD <span> / TEAM 5</span>
          </div>
        </div>

        <section className="auth-card" aria-labelledby="auth-title">
          <div className="auth-badge">
            <Icon name={isRegister ? 'user' : 'lock'} size={17} />
            {isRegister ? 'NEW ACCOUNT' : 'SECURE ACCESS'}
          </div>

          <h2 id="auth-title">
            {isRegister ? 'Create your account.' : 'Welcome back.'}
          </h2>
          <p className="auth-subtitle">
            {isRegister
              ? 'Start building your personalized preparedness plan.'
              : 'Sign in to your preparedness dashboard.'}
          </p>

          <div className="auth-availability">
            <Icon name="alert" size={17} />
            <span>Frontend preview: authentication API integration is pending.</span>
          </div>

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            {isRegister && (
              <div className="field">
                <label htmlFor="name">Full Name</label>
                <div className="input-wrap">
                  <Icon name="user" size={19} />
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={values.name}
                    onChange={(event) => update('name', event.target.value)}
                    placeholder="Your name"
                    autoComplete="name"
                    required
                  />
                </div>
              </div>
            )}

            <div className="field">
              <label htmlFor="email">Email Address</label>
              <div className="input-wrap">
                <Icon name="mail" size={19} />
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={values.email}
                  onChange={(event) => update('email', event.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="password">Password</label>
              <div className="input-wrap">
                <Icon name="lock" size={19} />
                <input
                  id="password"
                  name="password"
                  type={visible ? 'text' : 'password'}
                  value={values.password}
                  onChange={(event) => update('password', event.target.value)}
                  placeholder="At least 8 characters"
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  required
                  minLength="8"
                />
                <button
                  className="password-toggle"
                  type="button"
                  onClick={() => setVisible(!visible)}
                  aria-label={visible ? 'Hide password' : 'Show password'}
                >
                  <Icon name={visible ? 'eyeOff' : 'eye'} size={19} />
                </button>
              </div>
            </div>

            {isRegister && (
              <div className="field">
                <label htmlFor="confirm">Confirm Password</label>
                <div className="input-wrap">
                  <Icon name="lock" size={19} />
                  <input
                    id="confirm"
                    name="confirm"
                    type={visible ? 'text' : 'password'}
                    value={values.confirm}
                    onChange={(event) => update('confirm', event.target.value)}
                    placeholder="Repeat your password"
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>
            )}

            {notice && (
              <div className={`form-notice ${notice.type}`} role="status">
                <Icon name={notice.type === 'error' ? 'alert' : 'check'} size={18} />
                <span>{notice.message}</span>
              </div>
            )}

            <button
              className="button button-primary auth-submit"
              type="submit"
              disabled={pending}
            >
              {pending ? 'Connecting to API…' : isRegister ? 'Create Account' : 'Log In'}
              {!pending && <Icon name="arrow" size={18} />}
            </button>
          </form>

          <div className="auth-switch">
            {isRegister ? 'Already have an account?' : "Don't have an account?"}
            {' '}
            <Link to={isRegister ? '/login' : '/register'}>
              {isRegister ? 'Log in' : 'Create one'}
            </Link>
          </div>

          <div className="auth-card-footnote">
            <Icon name="shield" size={15} />
            Built around household preparedness, not guaranteed survival outcomes.
          </div>
        </section>
      </div>
    </main>
  )
}
