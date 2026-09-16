import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listBatches, listChildren, listRecipes, listServingEvents, listUsers } from '../lib/data/index.js'

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

    setRows(
      events.map((event) => {
        const batch = batchById.get(event.batch_id)
        return {
          event,
          recipeTitle: (batch && recipeById.get(batch.recipe_id)?.title) ?? 'Unknown recipe',
          childName: (batch && childById.get(batch.child_id)?.name) ?? 'Unknown',
          servedByName: userById.get(event.served_by)?.name ?? 'Unknown',
        }
      })
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
          {rows.map(({ event, recipeTitle, childName, servedByName }) => (
            <li key={event.id}>
              <Link to={`/batches/${event.batch_id}`}>
                <div className="history-summary">
                  <strong>{recipeTitle}</strong> · {childName}
                </div>
                <div className="history-meta">
                  {event.portions_used} portion{event.portions_used === 1 ? '' : 's'} · {event.satisfaction_rating}
                  /5 · {servedByName} · {new Date(event.served_at).toLocaleString()}
                </div>
                {event.notes && <div className="history-notes">{event.notes}</div>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
