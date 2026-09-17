import { useEffect, useState } from 'react'
import { getPhotoUrl, listBatches, listChildren, listRecipes, listServingEvents, listUsers } from '../lib/data/index.js'
import { satisfactionFace, satisfactionLabel } from '../lib/satisfaction.js'

function capitalize(s) {
  return s ? s[0].toUpperCase() + s.slice(1) : s
}

function formatDate(dateStr) {
  const d = new Date(dateStr)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yy = String(d.getFullYear()).slice(-2)
  return `${dd}/${mm}/${yy}`
}

function formatTime(dateStr) {
  const d = new Date(dateStr)
  let h = d.getHours()
  const m = String(d.getMinutes()).padStart(2, '0')
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${String(h).padStart(2, '0')}:${m} ${ampm}`
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
  const [children, setChildren] = useState(null)
  const [childFilter, setChildFilter] = useState('')
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
    const userById = new Map(users.map((u) => [u.id, u]))
    // A serving with no linked batch has no direct way to know the child.
    // With just one child in the system it's unambiguous; with more than
    // one it's genuinely unknown, so it's left out of a specific-child
    // filter (still shows under "All children").
    const onlyChildId = children.length === 1 ? children[0].id : null

    setChildren(children)
    setRows(
      await Promise.all(
        events.map(async (event) => {
          const batch = batchById.get(event.batch_id)
          return {
            event,
            title: (batch && recipeById.get(batch.recipe_id)?.title) ?? event.description ?? capitalize(event.meal_type),
            childId: batch?.child_id ?? onlyChildId,
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

  const filteredRows = rows && childFilter ? rows.filter((r) => r.childId === childFilter) : rows
  const groups = filteredRows ? groupRows(filteredRows) : null

  return (
    <div>
      <div className="page-header">
        <h2>History</h2>
        {children && children.length > 1 && (
          <select value={childFilter} onChange={(e) => setChildFilter(e.target.value)}>
            <option value="">All children</option>
            {children.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
        {children && children.length === 1 && <span className="history-child-label">{children[0].name}</span>}
      </div>

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
            const batchNames = group.items.filter((i) => i.event.batch_id).map((i) => i.title)
            const freeText = [
              ...group.items.filter((i) => !i.event.batch_id && i.event.description).map((i) => i.event.description),
              group.notes,
            ].filter(Boolean)

            return (
              <li key={group.id}>
                <div>
                  <div className="history-summary">
                    {formatDate(group.servedAt)} - {capitalize(group.mealType)}
                  </div>
                  <div className="history-meta">
                    {group.servedByName} at {formatTime(group.servedAt)} ·{' '}
                    <span title={satisfactionLabel(group.rating)}>{satisfactionFace(group.rating)}</span>
                  </div>
                  {batchNames.length > 0 && <div className="history-notes">{batchNames.join(', ')}</div>}
                  {freeText.map((text, i) => (
                    <div key={i} className="history-notes">
                      {text}
                    </div>
                  ))}
                  {group.photoUrl && <img className="serving-photo" src={group.photoUrl} alt="" />}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
