import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getPhotoUrl, listBatches, listChildren, listRecipes } from '../lib/data/index.js'

// yyyy-mm-dd (date-only, no time) so batches expiring on the same calendar
// day group together regardless of what time they were logged.
function expiryKey(batch) {
  return batch.expires_at ? batch.expires_at.slice(0, 10) : null
}

function formatExpiry(key) {
  if (!key) return 'No expiry set'
  return new Date(key).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

// Once M1 lands, wire a Supabase Realtime subscription on `batches` here and
// call refresh() on change instead of only fetching once on mount.
export default function FreezerView() {
  const [groups, setGroups] = useState(null)
  const [singleChild, setSingleChild] = useState(false)
  const [error, setError] = useState(null)

  async function refresh() {
    const [batches, recipes, children] = await Promise.all([listBatches(), listRecipes(), listChildren()])
    setSingleChild(children.length === 1)

    const inStock = batches.filter((b) => b.portions_remaining > 0)
    const withPhotos = await Promise.all(
      inStock.map(async (b) => ({ ...b, photoUrl: await getPhotoUrl(b.photo_path) }))
    )

    const recipeById = new Map(recipes.map((r) => [r.id, r]))
    const byChild = new Map()
    for (const batch of withPhotos) {
      if (!byChild.has(batch.child_id)) byChild.set(batch.child_id, new Map())
      const byExpiry = byChild.get(batch.child_id)
      const key = expiryKey(batch)
      if (!byExpiry.has(key)) byExpiry.set(key, [])
      byExpiry.get(key).push(batch)
    }

    const today = new Date().toISOString().slice(0, 10)

    setGroups(
      children
        .filter((c) => byChild.has(c.id))
        .map((child) => ({
          child,
          // Soonest expiry first; batches with no expiry set trail at the end.
          expiryGroups: [...byChild.get(child.id).entries()]
            .sort(([a], [b]) => (a ?? '9999').localeCompare(b ?? '9999'))
            .map(([key, groupBatches]) => ({
              key,
              label: formatExpiry(key),
              overdue: key !== null && key < today,
              batches: groupBatches
                .map((b) => ({ ...b, recipe: recipeById.get(b.recipe_id) }))
                .sort((a, b) => new Date(a.prepared_at) - new Date(b.prepared_at)),
            })),
        }))
    )
  }

  useEffect(() => {
    refresh().catch((e) => setError(e.message))
  }, [])

  if (error) return <p className="error">{error}</p>
  if (!groups) return <p>Loading…</p>

  return (
    <div>
      <h2>Freezer</h2>

      {groups.length === 0 && <p className="empty-state">Nothing in the freezer right now.</p>}

      {groups.map(({ child, expiryGroups }) => (
        <section key={child.id} className="freezer-child-group">
          {!singleChild && <h3>{child.name}</h3>}
          {expiryGroups.map(({ key, label, overdue, batches }) => (
            <div key={key ?? 'none'} className="freezer-recipe-group">
              <h4 className={overdue ? 'freezer-expiry-overdue' : ''}>
                {label}
                {overdue && ' · Expired'}
              </h4>
              <div className="batch-cards">
                {batches.map((batch) => (
                  <Link key={batch.id} to={`/batches/${batch.id}`} className="batch-card">
                    {batch.photoUrl && <img src={batch.photoUrl} alt="" />}
                    <div className="batch-card-info">
                      <strong>{batch.recipe?.title ?? 'Unknown recipe'}</strong>
                      <span>{batch.portions_remaining} left</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </section>
      ))}
    </div>
  )
}
