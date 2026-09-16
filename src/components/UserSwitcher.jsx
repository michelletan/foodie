import { useEffect, useState } from 'react'
import { getCurrentUser, listUsers, setCurrentUser } from '../lib/data/index.js'

// Local-dev-only "logged in as" control — setCurrentUser is undefined once a
// real auth backend is wired up in M1, so this renders nothing then.
export default function UserSwitcher() {
  const [users, setUsers] = useState([])
  const [current, setCurrent] = useState(null)

  useEffect(() => {
    listUsers().then(setUsers)
    getCurrentUser().then(setCurrent)
  }, [])

  if (!setCurrentUser || !current) return null

  async function handleChange(e) {
    await setCurrentUser(e.target.value)
    setCurrent(await getCurrentUser())
  }

  return (
    <div className="user-switcher">
      Acting as{' '}
      <select value={current.id} onChange={handleChange}>
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name} ({u.role})
          </option>
        ))}
      </select>
    </div>
  )
}
