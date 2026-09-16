import { useEffect, useState } from 'react'
import {
  getCurrentUser,
  getSettings,
  listChildren,
  listRecipes,
  listUsers,
  setCurrentUser,
} from './lib/data/index.js'
import './App.css'

// Temporary smoke-test screen proving the data layer works end-to-end
// against the local (Supabase-free) backend. Replaced by real screens
// starting at M2 in the README roadmap.
function App() {
  const [users, setUsers] = useState([])
  const [currentUser, setCurrentUserState] = useState(null)
  const [children, setChildren] = useState([])
  const [recipes, setRecipes] = useState([])
  const [settings, setSettings] = useState(null)

  async function refresh() {
    setUsers(await listUsers())
    setCurrentUserState(await getCurrentUser())
    setChildren(await listChildren())
    setRecipes(await listRecipes())
    setSettings(await getSettings())
  }

  useEffect(() => {
    refresh()
  }, [])

  async function handleSwitchUser(e) {
    await setCurrentUser(e.target.value)
    refresh()
  }

  return (
    <section style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>foodie — data layer smoke test</h1>
      <p>
        Backend: <code>{import.meta.env.VITE_DATA_BACKEND ?? 'local'}</code>
      </p>

      {currentUser && (
        <p>
          Acting as: <strong>{currentUser.name}</strong> ({currentUser.role}/{currentUser.persona}){' '}
          {setCurrentUser && (
            <select value={currentUser.id} onChange={handleSwitchUser}>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          )}
        </p>
      )}

      <ul>
        <li>Users seeded: {users.length}</li>
        <li>Children seeded: {children.map((c) => c.name).join(', ') || 'none'}</li>
        <li>Recipes: {recipes.length}</li>
        <li>Low stock threshold: {settings?.low_stock_threshold ?? '—'}</li>
      </ul>
    </section>
  )
}

export default App
