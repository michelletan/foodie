import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import logo from '../assets/logo.svg'
import { getPhotoUrl, listBatches, listChildren, listRecipes } from '../lib/data/index.js'

// Batches with portions_remaining === 0 — fully served, or thrown out via
// BatchDetail's "Throw out" button. Either way the record stays around here
// for reference; listBatches() already excludes voided/deleted by default,
// which is what we want (those are separate concepts, not "used up").
export default function UsedBatchesView() {
  const [groups, setGroups] = useState(null)
  const [singleChild, setSingleChild] = useState(false)
  const [error, setError] = useState(null)

  async function refresh() {
    const [batches, recipes, children] = await Promise.all([listBatches(), listRecipes(), listChildren()])
    setSingleChild(children.length === 1)

    const used = batches
      .filter((b) => b.portions_remaining === 0)
      .sort((a, b) => new Date(b.prepared_at) - new Date(a.prepared_at))
    const withPhotos = await Promise.all(
      used.map(async (b) => ({ ...b, photoUrl: await getPhotoUrl(b.photo_path) }))
    )

    const recipeById = new Map(recipes.map((r) => [r.id, r]))
    const byChild = new Map()
    for (const batch of withPhotos) {
      if (!byChild.has(batch.child_id)) byChild.set(batch.child_id, [])
      byChild.get(batch.child_id).push({ ...batch, recipe: recipeById.get(batch.recipe_id) })
    }

    setGroups(
      children
        .filter((c) => byChild.has(c.id))
        .map((child) => ({ child, batches: byChild.get(child.id) }))
    )
  }

  useEffect(() => {
    refresh().catch((e) => setError(e.message))
  }, [])

  if (error) return <p className="error">{error}</p>
  if (!groups) return <p>Loading…</p>

  return (
    <div>
      <div className="page-header">
        <h2>Used batches</h2>
        <Link className="button secondary" to="/freezer">
          Back to freezer
        </Link>
      </div>

      {groups.length === 0 && <p className="empty-state">No used-up batches yet.</p>}

      {groups.map(({ child, batches }) => (
        <section key={child.id} className="freezer-child-group">
          {!singleChild && <h3>{child.name}</h3>}
          <div className="batch-cards">
            {batches.map((batch) => (
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
                  <span>{new Date(batch.prepared_at).toLocaleDateString()}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
