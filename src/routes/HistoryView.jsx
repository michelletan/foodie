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

// listServingEvents() defaults to includeVoided: false, which is exactly the
// spec's "voided entries visibly excluded (but not deleted from the
// record)" — voided rows just don't appear here, not removed from storage.
// Once M1 lands, wire a Supabase Realtime subscription on `serving_events`
// here and call refresh() on change instead of only fetching once on mount.
export default function HistoryView() {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState(null)

  async function refresh() {
    const [events, batches, recipes, children, users] = await Promise.all([
      listServingEvents(),
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
    refresh().catch((e) => setError(e.message))
  }, [])

  if (error) return <p className="error">{error}</p>
  if (!rows) return <p>Loading…</p>

  return (
    <div>
      <h2>History</h2>

      {rows.length === 0 && <p className="empty-state">No servings logged yet.</p>}

      {rows.length > 0 && (
        <ul className="history-list">
          {rows.map(({ event, title, childName, servedByName, photoUrl }) => {
            const content = (
              <>
                <div className="history-summary">
                  <strong>{title}</strong> · {childName}
                </div>
                <div className="history-meta">
                  {event.portions_used != null && (
                    <>
                      {event.portions_used} portion{event.portions_used === 1 ? '' : 's'} ·{' '}
                    </>
                  )}
                  {capitalize(event.meal_type)} · {event.satisfaction_rating}/5 · {servedByName} ·{' '}
                  {new Date(event.served_at).toLocaleString()}
                </div>
                {event.description && <div className="history-notes">{event.description}</div>}
                {event.notes && <div className="history-notes">{event.notes}</div>}
                {photoUrl && <img className="serving-photo" src={photoUrl} alt="" />}
              </>
            )
            return (
              <li key={event.id}>
                {event.batch_id ? <Link to={`/batches/${event.batch_id}`}>{content}</Link> : <div>{content}</div>}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
