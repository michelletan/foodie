import { useEffect, useState } from 'react'
import { getCurrentUser, getSettings, updateSettings } from '../lib/data/index.js'

// Admin-only (reachable via the username dropdown, which only shows this
// link to admins — but this page checks role itself too, same as
// updateSettings() does server-side, since the URL is still typeable).
export default function SettingsView() {
  const [isAdmin, setIsAdmin] = useState(null)
  const [threshold, setThreshold] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)

  async function refresh() {
    const currentUser = await getCurrentUser()
    if (currentUser.role !== 'admin') {
      setIsAdmin(false)
      return
    }
    setIsAdmin(true)
    const settings = await getSettings()
    setThreshold(String(settings.low_stock_threshold))
  }

  useEffect(() => {
    refresh().catch((e) => setError(e.message))
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSaved(false)
    const value = Number(threshold)
    if (!Number.isInteger(value) || value < 0) return setError('Enter a valid whole number.')
    setSaving(true)
    try {
      await updateSettings({ low_stock_threshold: value })
      setSaved(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (error) return <p className="error">{error}</p>
  if (isAdmin === false) return <p className="empty-state">This page is for admins only.</p>
  if (isAdmin === null) return <p>Loading…</p>

  return (
    <div>
      <h2>Settings</h2>

      <form onSubmit={handleSubmit} className="field">
        <label htmlFor="threshold">Low stock threshold (portions)</label>
        <input
          id="threshold"
          type="number"
          inputMode="numeric"
          min="0"
          step="1"
          value={threshold}
          onChange={(e) => {
            setThreshold(e.target.value)
            setSaved(false)
          }}
        />
        <button type="submit" className="button" disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        {saved && <p className="hint">Saved.</p>}
      </form>
    </div>
  )
}
