import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getPhotoUrl, listBatches, listChildren, listRecipes } from '../lib/data/index.js'

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
      const byRecipe = byChild.get(batch.child_id)
      if (!byRecipe.has(batch.recipe_id)) byRecipe.set(batch.recipe_id, [])
      byRecipe.get(batch.recipe_id).push(batch)
    }

    setGroups(
      children
        .filter((c) => byChild.has(c.id))
        .map((child) => ({
          child,
          recipeGroups: [...byChild.get(child.id).entries()].map(([recipeId, groupBatches]) => ({
            recipe: recipeById.get(recipeId),
            batches: groupBatches.sort((a, b) => new Date(a.prepared_at) - new Date(b.prepared_at)),
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

      {groups.map(({ child, recipeGroups }) => (
        <section key={child.id} className="freezer-child-group">
          {!singleChild && <h3>{child.name}</h3>}
          {recipeGroups.map(({ recipe, batches }) => (
            <div key={recipe?.id ?? 'unknown'} className="freezer-recipe-group">
              <h4>{recipe?.title ?? 'Unknown recipe'}</h4>
              <div className="batch-cards">
                {batches.map((batch) => (
                  <Link key={batch.id} to={`/batches/${batch.id}`} className="batch-card">
                    {batch.photoUrl && <img src={batch.photoUrl} alt="" />}
                    <div className="batch-card-info">
                      <strong>{batch.portions_remaining} left</strong>
                      <span>{new Date(batch.prepared_at).toLocaleDateString()}</span>
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
