import { useEffect, useState } from 'react'
import { getCurrentUser, signOut } from '../lib/data/index.js'

// The mirror image of UserSwitcher.jsx — renders nothing when there's no
// real auth backend (signOut undefined on the local dev backend).
export default function SignOutButton() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    if (!signOut) return
    getCurrentUser()
      .then(setUser)
      .catch(() => {})
  }, [])

  if (!signOut) return null

  return (
    <div className="user-switcher">
      {user?.name ?? '…'}{' '}
      <button type="button" className="button secondary" onClick={() => signOut()}>
        Sign out
      </button>
    </div>
  )
}
