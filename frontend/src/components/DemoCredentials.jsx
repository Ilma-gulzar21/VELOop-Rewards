import { useState } from 'react'
import './DemoCredentials.css'

// NON-PRODUCTION helper. Renders only when VITE_DEMO_MODE === 'true'.
// The values come from build-time env vars and must be DEMO accounts only.
// Never set VITE_DEMO_MODE=true in a production build.
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true'

const DemoCredentials = ({ role = 'user', onUse }) => {
  const [open, setOpen] = useState(true)

  if (!DEMO_MODE) return null

  const isAdmin = role === 'admin'
  const email = isAdmin
    ? import.meta.env.VITE_DEMO_ADMIN_EMAIL
    : import.meta.env.VITE_DEMO_USER_EMAIL
  const password = isAdmin
    ? import.meta.env.VITE_DEMO_ADMIN_PASSWORD
    : import.meta.env.VITE_DEMO_USER_PASSWORD

  if (!email || !password) return null

  return (
    <aside className="demo-credentials" aria-label="Demo credentials">
      <button
        type="button"
        className="demo-credentials__toggle"
        onClick={() => setOpen(value => !value)}
        aria-expanded={open}
      >
        Demo credentials (non-production)
      </button>

      {open && (
        <div className="demo-credentials__body">
          <p>
            For evaluation only. These are demo accounts on a demo database,
            not real credentials.
          </p>
          <dl>
            <dt>Email</dt>
            <dd><code>{email}</code></dd>
            <dt>Password</dt>
            <dd><code>{password}</code></dd>
          </dl>
          <button
            type="button"
            className="demo-credentials__use"
            onClick={() => onUse?.({ email, password })}
          >
            Fill demo {isAdmin ? 'admin' : 'user'} login
          </button>
        </div>
      )}
    </aside>
  )
}

export default DemoCredentials
