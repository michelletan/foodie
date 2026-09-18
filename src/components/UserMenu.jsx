import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCurrentUser, signOut } from '../lib/data/index.js'

// The mirror image of UserSwitcher.jsx — renders nothing when there's no
// real auth backend (signOut undefined on the local dev backend).
export default function UserMenu() {
  const [user, setUser] = useState(null)
  const detailsRef = useRef(null)

  useEffect(() => {
    if (!signOut) return
    getCurrentUser()
      .then(setUser)
      .catch(() => {})
  }, [])

  // <details> only closes natively when its own <summary> is clicked again
  // — it stays open if you click anywhere else in the app. Close it on any
  // outside click too.
  useEffect(() => {
    if (!signOut) return
    function handleOutsideClick(e) {
      if (detailsRef.current && !detailsRef.current.contains(e.target)) {
        detailsRef.current.open = false
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  if (!signOut) return null

  function closeMenu() {
    if (detailsRef.current) detailsRef.current.open = false
  }

  function handleSignOut() {
    closeMenu()
    signOut()
  }

  return (
    <details ref={detailsRef} className="user-menu">
      <summary>{user?.name ?? '…'}</summary>
      <div className="user-menu-dropdown">
        {user?.role === 'admin' && (
          <Link to="/settings" onClick={closeMenu}>
            Settings
          </Link>
        )}
        <button type="button" onClick={handleSignOut}>
          Sign out
        </button>
      </div>
    </details>
  )
}
