import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import logo from '../assets/logo.svg'
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

const SORT_OPTIONS = [
  { value: 'expiry', label: 'Expiry date' },
  { value: 'created', label: 'Date prepared' },
  { value: 'portions', label: 'Portions left' },
]

// Builds the sections shown under a child: 'expiry' keeps the existing
// expiry-date grouping (with overdue highlighting), while 'created' and
// 'portions' just sort everything into one flat, unlabeled section — an
// explicit sort pick means the person wants a simple ranked list, not more
// grouping.
function buildSections(batches, sortBy) {
  if (sortBy === 'created') {
    return [{ key: 'flat', label: null, overdue: false, batches: [...batches].sort((a, b) => new Date(a.prepared_at) - new Date(b.prepared_at)) }]
  }
  if (sortBy === 'portions') {
    return [{ key: 'flat', label: null, overdue: false, batches: [...batches].sort((a, b) => a.portions_remaining - b.portions_remaining) }]
  }

  const byExpiry = new Map()
  for (const batch of batches) {
    const key = expiryKey(batch)
    if (!byExpiry.has(key)) byExpiry.set(key, [])
    byExpiry.get(key).push(batch)
  }
  const today = new Date().toISOString().slice(0, 10)
  return [...byExpiry.entries()]
    // Soonest expiry first; batches with no expiry set trail at the end.
    .sort(([a], [b]) => (a ?? '9999').localeCompare(b ?? '9999'))
    .map(([key, groupBatches]) => ({
      key: key ?? 'none',
      label: formatExpiry(key),
      overdue: key !== null && key < today,
      batches: [...groupBatches].sort((a, b) => new Date(a.prepared_at) - new Date(b.prepared_at)),
    }))
}

// Once M1 lands, wire a Supabase Realtime subscription on `batches` here and
// call refresh() on change instead of only fetching once on mount.
export default function FreezerView() {
  const [childGroups, setChildGroups] = useState(null)
  const [singleChild, setSingleChild] = useState(false)
  const [sortBy, setSortBy] = useState('expiry')
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
      if (!byChild.has(batch.child_id)) byChild.set(batch.child_id, [])
      byChild.get(batch.child_id).push({ ...batch, recipe: recipeById.get(batch.recipe_id) })
    }

    setChildGroups(
      children
        .filter((c) => byChild.has(c.id))
        .map((child) => ({ child, batches: byChild.get(child.id) }))
    )
  }

  useEffect(() => {
    refresh().catch((e) => setError(e.message))
  }, [])

  if (error) return <p className="error">{error}</p>
  if (!childGroups) return <p>Loading…</p>

  return (
    <div>
      <div className="page-header">
        <h2>Freezer</h2>
        <Link className="button secondary" to="/freezer/used">
          Used batches
        </Link>
      </div>

      {childGroups.length > 0 && (
        <div className="freezer-sort">
          <label htmlFor="freezerSort">Sort by</label>
          <select id="freezerSort" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {childGroups.length === 0 && <p className="empty-state">Nothing in the freezer right now.</p>}

      {childGroups.map(({ child, batches }) => (
        <section key={child.id} className="freezer-child-group">
          {!singleChild && <h3>{child.name}</h3>}
          {buildSections(batches, sortBy).map(({ key, label, overdue, batches: sectionBatches }) => (
            <div key={key} className="freezer-recipe-group">
              {label && (
                <h4 className={overdue ? 'freezer-expiry-overdue' : ''}>
                  {label}
                  {overdue && ' · Expired'}
                </h4>
              )}
              <div className="batch-cards">
                {sectionBatches.map((batch) => (
                  <Link key={batch.id} to={`/batches/${batch.id}`} className="batch-card">
                    {batch.photoUrl ? (
                      <img src={batch.photoUrl} alt="" />
                    ) : (
                      <div className="batch-card-placeholder">
                        <img src={logo} alt="" width="32" height="32" />
                      </div>
                    )}
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
