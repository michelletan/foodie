import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getPhotoUrl,
  listBatches,
  listChildren,
  listRecipes,
  listServingEvents,
  listUsers,
} from '../lib/data/index.js'

function capitalize(s) {
  return s ? s[0].toUpperCase() + s.slice(1) : s
}

const PERIODS = [
  { value: 'week', label: 'Past week' },
  { value: 'month', label: 'Past month', days: 30 },
  { value: '3months', label: 'Past 3 months', days: 90 },
  { value: 'all', label: 'All time' },
]

// Calendar week, not a rolling 7 days — Monday 00:00 local time through now.
function startOfWeek(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const daysSinceMonday = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - daysSinceMonday)
  return d
}

function sinceFor(period) {
  if (period === 'week') return startOfWeek(new Date()).toISOString()
  const days = PERIODS.find((p) => p.value === period)?.days
  return days ? new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString() : undefined
}

// ServeForm.jsx saves one meal that spans multiple freezer batches as
// several serving_event rows (one per batch, no shared "meal" id in the
// schema) — see its handleSubmit for why. Re-group them here for display:
// rows sharing who/what/how-it-went, saved within a few seconds of each
// other, are almost certainly one "Save" click, not a coincidence — a real
// second meal logged that close together with identical rating/notes is
// vanishingly unlikely for how this app gets used.
const GROUP_WINDOW_MS = 10_000

function groupRows(rows) {
  const groups = []
  for (const row of rows) {
    const last = groups[groups.length - 1]
    const sameMeal =
      last &&
      last.servedByName === row.servedByName &&
      last.mealType === row.event.meal_type &&
      last.rating === row.event.satisfaction_rating &&
      last.notes === (row.event.notes ?? null) &&
      Math.abs(new Date(last.lastServedAt) - new Date(row.event.served_at)) <= GROUP_WINDOW_MS
    if (sameMeal) {
      last.items.push(row)
      last.lastServedAt = row.event.served_at
      if (!last.photoUrl && row.photoUrl) last.photoUrl = row.photoUrl
    } else {
      groups.push({
        id: row.event.id,
        servedByName: row.servedByName,
        mealType: row.event.meal_type,
        rating: row.event.satisfaction_rating,
        notes: row.event.notes ?? null,
        childName: row.childName,
        servedAt: row.event.served_at,
        lastServedAt: row.event.served_at,
        photoUrl: row.photoUrl,
        items: [row],
      })
    }
  }
  return groups
}

// listServingEvents() defaults to includeVoided: false, which is exactly the
// spec's "voided entries visibly excluded (but not deleted from the
// record)" — voided rows just don't appear here, not removed from storage.
// Once M1 lands, wire a Supabase Realtime subscription on `serving_events`
// here and call refresh() on change instead of only fetching once on mount.
export default function HistoryView() {
  const [period, setPeriod] = useState('week')
  const [rows, setRows] = useState(null)
  const [error, setError] = useState(null)

  async function refresh() {
    const [events, batches, recipes, children, users] = await Promise.all([
      listServingEvents({ since: sinceFor(period) }),
      listBatches({ includeVoided: true }),
      listRecipes(),
      listChildren(),
      listUsers(),
    ])

    const batchById = new Map(batches.map((b) => [b.id, b]))
    const recipeById = new Map(recipes.map((r) => [r.id, r]))
    const childById = new Map(children.map((c) => [c.id, c]))
    const userById = new Map(users.map((u) => [u.id, u]))
    // A serving with no linked batch has no direct way to know the child —
    // fall back to the one child in the system, matching how the rest of
    // the app skips child-selection entirely when there's only one (§3.5).
    const onlyChildName = children.length === 1 ? children[0].name : null

    setRows(
      await Promise.all(
        events.map(async (event) => {
          const batch = batchById.get(event.batch_id)
          return {
            event,
            title: (batch && recipeById.get(batch.recipe_id)?.title) ?? event.description ?? capitalize(event.meal_type),
            childName: (batch && childById.get(batch.child_id)?.name) ?? onlyChildName ?? 'Unknown',
            servedByName: userById.get(event.served_by)?.name ?? 'Unknown',
            photoUrl: await getPhotoUrl(event.photo_path),
          }
        })
      )
    )
  }

  useEffect(() => {
    setRows(null)
    refresh().catch((e) => setError(e.message))
  }, [period])

  const groups = rows ? groupRows(rows) : null

  return (
    <div>
      <h2>History</h2>

      <div className="quick-options">
        <button
          type="button"
          className={`quick-option${period === 'week' ? ' selected' : ''}`}
          onClick={() => setPeriod('week')}
        >
          Past week
        </button>
        <select
          className={`quick-option${period !== 'week' ? ' selected' : ''}`}
          value={period === 'week' ? '' : period}
          onChange={(e) => setPeriod(e.target.value)}
        >
          <option value="" disabled>
            More…
          </option>
          {PERIODS.filter((p) => p.value !== 'week').map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="error">{error}</p>}
      {!error && !groups && <p>Loading…</p>}

      {groups && groups.length === 0 && <p className="empty-state">No servings logged yet.</p>}

      {groups && groups.length > 0 && (
        <ul className="history-list">
          {groups.map((group) => {
            const totalPortions = group.items.reduce((sum, i) => sum + (i.event.portions_used ?? 0), 0)
            const batchLinks = group.items.filter((i) => i.event.batch_id)

            return (
              <li key={group.id}>
                <div>
                  <div className="history-summary">
                    <strong>{group.items.map((i) => i.title).join(' + ')}</strong> · {group.childName}
                  </div>
                  <div className="history-meta">
                    {totalPortions > 0 && (
                      <>
                        {totalPortions} portion{totalPortions === 1 ? '' : 's'} ·{' '}
                      </>
                    )}
                    {capitalize(group.mealType)} · {group.rating}/5 · {group.servedByName} ·{' '}
                    {new Date(group.servedAt).toLocaleString()}
                  </div>
                  {group.items.map(
                    (i) => i.event.description && <div key={i.event.id} className="history-notes">{i.event.description}</div>
                  )}
                  {group.notes && <div className="history-notes">{group.notes}</div>}
                  {group.photoUrl && <img className="serving-photo" src={group.photoUrl} alt="" />}
                  {batchLinks.length > 0 && (
                    <div className="history-batch-links">
                      {batchLinks.map((i) => (
                        <Link key={i.event.batch_id} to={`/batches/${i.event.batch_id}`}>
                          {i.title}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
