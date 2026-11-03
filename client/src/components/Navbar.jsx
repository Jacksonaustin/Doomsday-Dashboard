import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { publicNavItems } from '../config/navigation.js'
import Icon from './Icon.jsx'

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  function isCurrent(to) {
    const [pathname, hash] = to.split('#')

    return (
      location.pathname === pathname &&
      (hash ? location.hash === `#${hash}` : !location.hash)
    )
  }

  function closeMenu() {
    setMenuOpen(false)
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
          <Link className="nav-login" to="/login">
            Log in
          </Link>
          <Link className="button button-primary button-small" to="/register">
            Get Started
            <Icon name="arrow" size={16} />
          </Link>
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

          <Link to="/login" onClick={closeMenu}>
            Log in
          </Link>
          <Link className="mobile-start" to="/register" onClick={closeMenu}>
            Get Started
          </Link>
        </nav>
      )}
    </header>
  )
}
