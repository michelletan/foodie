import { useEffect, useState } from 'react'
import { getSession, onAuthStateChange } from '../lib/data/index.js'
import Login from '../routes/Login.jsx'

// getSession only exists on the Supabase backend (see index.js) — the
// local dev backend has no real auth, so there's nothing to gate.
const authRequired = Boolean(getSession)

export default function AuthGate({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(authRequired)

  useEffect(() => {
    if (!authRequired) return
    getSession().then((s) => {
      setSession(s)
      setLoading(false)
    })
    return onAuthStateChange((s) => setSession(s))
  }, [])

  if (!authRequired) return children
  if (loading) return <p>Loading…</p>
  if (!session) return <Login />
  return children
}
