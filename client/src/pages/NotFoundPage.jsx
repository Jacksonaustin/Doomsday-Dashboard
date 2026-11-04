import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <main className="page-container not-found">
      <h1>Page not found.</h1>
      <p>That route isn't available yet.</p>
      <Link className="button button-primary" to="/">
        Return Home
      </Link>
    </main>
  )
}
