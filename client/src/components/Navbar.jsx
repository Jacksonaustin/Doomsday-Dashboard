import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { publicNavItems } from '../config/navigation.js'
import useAuth from '../context/useAuth.js'
import Icon from './Icon.jsx'

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [logoutError, setLogoutError] = useState('')
  const [accountOpen, setAccountOpen] = useState(false)
  const location = useLocation()
  const { user, logout } = useAuth()

  function isCurrent(to) {
    const [pathname, hash] = to.split('#')

    return (
      location.pathname === pathname &&
      (hash ? location.hash === `#${hash}` : !location.hash)
    )
  }

  function closeMenu() {
  setMenuOpen(false)
  setAccountOpen(false)
}

  async function handleLogout() {
    try {
      await logout()
      setLogoutError('')
      closeMenu()
    } catch {
      setLogoutError('Unable to log out. Please try again.')
    }
  }

  // Both desktop and mobile links use the same navigation configuration.
  return (
    <header className="site-header">
      <div className="page-container nav-inner">
        <Link
          className="brand"
          to="/"
          onClick={closeMenu}
          aria-label="Doomsday Dashboard home"
        >
          <span className="brand-icon">
            <Icon name="shield" size={23} />
          </span>
          <span className="brand-wordmark">
            DOOMSDAY <span>DASHBOARD</span>
          </span>
        </Link>

        <nav className="desktop-links" aria-label="Main navigation">
          {publicNavItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`nav-link ${isCurrent(item.to) ? 'current' : ''}`}
              aria-current={isCurrent(item.to) ? 'page' : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>


      <div className="desktop-actions">
        {user ? (
          <div className="relative">

            {/* Account dropdown trigger */}
            <button
              type="button"
              onClick={() => setAccountOpen((current) => !current)}
              aria-expanded={accountOpen}
              aria-haspopup="true"
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-[#304235] bg-[#18231c] px-3 py-2 text-sm text-[#eaf2ea] transition-colors hover:bg-[#243329] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#b6db8a]"
            >
              {/* Account avatar */}
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#304235] text-xs font-bold text-[#b6db8a]">
                {user.name?.charAt(0)?.toUpperCase()}
              </span>

              <span>{user.name}</span>

              {/* Dropdown arrow */}
              <span className={`text-[#b6db8a] transition-transform ${accountOpen ? 'rotate-180' : ''}`}>
                ▾
              </span>
            </button>

            {/* Account dropdown menu */}
            {accountOpen && (
              <div className="absolute right-0 top-full z-50 mt-3 w-44 rounded-lg border border-[#304235] bg-[#18231c] p-2 shadow-lg">

                <Link
                  to="/profile"
                  onClick={closeMenu}
                  className="block rounded-md px-3 py-2 text-sm text-[#eaf2ea] hover:bg-[#304235]"
                >
                  My Profile
                </Link>

                <div className="my-2 border-t border-[#304235]" />

                <button
                  type="button"
                  onClick={handleLogout}
                  className="block w-full cursor-pointer rounded-md px-3 py-2 text-left text-sm text-[#eaf2ea] hover:bg-[#304235]"
                >
                  Log Out
                </button>

              </div>
            )}
          </div>
        ) : (
          <>
            <Link className="nav-login" to="/login">
              Log in
            </Link>

            <Link className="button button-primary button-small" to="/register">
              Get Started
              <Icon name="arrow" size={16} />
            </Link>
          </>
        )}
      </div>

        {/* mobile side ---------------------------------------------------------------- */}
        <button
          className="mobile-toggle"
          type="button"
          onClick={() => setMenuOpen((current) => !current)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
        >
          <Icon name={menuOpen ? 'close' : 'menu'} size={24} />
        </button>
      </div>

      {menuOpen && (
        <nav className="mobile-links" aria-label="Mobile navigation">
          {publicNavItems.map((item) => (
            <Link key={item.to} to={item.to} onClick={closeMenu}>
              {item.label}
            </Link>
          ))}

          {user ? (
            <>
              <Link to="/profile" onClick={closeMenu}>
                My Profile
              </Link>

              <button type="button" onClick={handleLogout}>
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={closeMenu}>
                Log in
              </Link>
              <Link className="mobile-start" to="/register" onClick={closeMenu}>
                Get Started
              </Link>
            </>
          )}
        </nav>
      )}
      {logoutError && <p className="nav-error" role="alert">{logoutError}</p>}
    </header>
  )
}
