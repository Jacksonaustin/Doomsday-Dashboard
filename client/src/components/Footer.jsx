import { Link } from 'react-router-dom'
import Icon from './Icon.jsx'

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="page-container footer-inner">
        <div className="footer-brand">
          <Icon name="shield" size={18} />
          DOOMSDAY DASHBOARD
          <span> / PROJECT TEAM 5</span>
        </div>

        <div className="footer-links">
          <Link to="/">Home</Link>
          <Link to="/login">Log in</Link>
          <Link to="/register">Register</Link>
        </div>
      </div>

      <div className="page-container footer-disclaimer">
        Planning and educational estimates only. Not official emergency instructions
        or a guarantee of safety.
      </div>
    </footer>
  )
}
