import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getCurrentUser,
  getSettings,
  listBatches,
  listRecipes,
  listServingEvents,
  updateSettings,
} from '../lib/data/index.js'
import { proteinInfo } from '../lib/proteins.js'

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack', 'milk']

function capitalize(s) {
  return s ? s[0].toUpperCase() + s.slice(1) : s
}

// Read-only rollup over recipes/batches/servings, visible to everyone —
// everything here is derived client-side from the same list*() calls other
// pages use, no new backend endpoints. The low-stock-threshold setting at
// the bottom stays admin-only (updateSettings() is still admin-gated
// server-side, in both localBackend.js and the Postgres function), so only
// that section checks role.
export default function AnalysisView() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [stats, setStats] = useState(null)
  const [threshold, setThreshold] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function refresh() {
    const currentUser = await getCurrentUser()
    setIsAdmin(currentUser.role === 'admin')

    const [recipes, batches, events, settings] = await Promise.all([
      listRecipes(),
      listBatches(),
      listServingEvents(),
      getSettings(),
    ])

    const recipeById = new Map(recipes.map((r) => [r.id, r]))
    const batchById = new Map(batches.map((b) => [b.id, b]))
    const inStock = batches.filter((b) => b.portions_remaining > 0)

    const lowStock = inStock
      .filter((b) => b.portions_remaining <= settings.low_stock_threshold)
      .map((b) => ({ ...b, recipe: recipeById.get(b.recipe_id) }))
      .sort((a, b) => a.portions_remaining - b.portions_remaining)

    const today = new Date().toISOString().slice(0, 10)
    const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    let expiredCount = 0
    let expiringSoonCount = 0
    for (const b of inStock) {
      if (!b.expires_at) continue
      const key = b.expires_at.slice(0, 10)
      if (key < today) expiredCount += 1
      else if (key <= in7Days) expiringSoonCount += 1
    }

    const ratings = events.map((e) => e.satisfaction_rating).filter((r) => r != null)
    const avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null

    const servingsByRecipe = new Map()
    const servingsByProtein = new Map()
    const servingsByMealType = new Map()
    for (const e of events) {
      servingsByMealType.set(e.meal_type, (servingsByMealType.get(e.meal_type) ?? 0) + 1)

      const batch = e.batch_id ? batchById.get(e.batch_id) : null
      const recipe = batch ? recipeById.get(batch.recipe_id) : null
      if (!recipe) continue

      const entry = servingsByRecipe.get(recipe.id) ?? { recipe, count: 0 }
      entry.count += 1
      servingsByRecipe.set(recipe.id, entry)

      const proteinKey = recipe.protein ?? 'unspecified'
      servingsByProtein.set(proteinKey, (servingsByProtein.get(proteinKey) ?? 0) + 1)
    }

    setStats({
      recipeCount: recipes.length,
      inStockCount: inStock.length,
      servingCount: events.length,
      avgRating,
      topRecipes: [...servingsByRecipe.values()].sort((a, b) => b.count - a.count).slice(0, 5),
      servingsByProtein: [...servingsByProtein.entries()].sort((a, b) => b[1] - a[1]),
      servingsByMealType: MEAL_TYPES.map((m) => [m, servingsByMealType.get(m) ?? 0]),
      lowStock,
      expiredCount,
      expiringSoonCount,
    })
    setThreshold(String(settings.low_stock_threshold))
  }

  useEffect(() => {
    refresh().catch((e) => setError(e.message))
  }, [])

  async function handleSaveThreshold(e) {
    e.preventDefault()
    setError(null)
    const value = Number(threshold)
    if (!Number.isInteger(value) || value < 0) return setError('Enter a valid whole number.')
    setSaving(true)
    try {
      await updateSettings({ low_stock_threshold: value })
      await refresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (error) return <p className="error">{error}</p>
  if (!stats) return <p>Loading…</p>

  return (
    <div>
      <h2>Analysis</h2>

      <div className="stat-grid">
        <div className="stat-card">
          <strong>{stats.recipeCount}</strong>
          <span>Recipes</span>
        </div>
        <div className="stat-card">
          <strong>{stats.inStockCount}</strong>
          <span>Batches in freezer</span>
        </div>
        <div className="stat-card">
          <strong>{stats.servingCount}</strong>
          <span>Servings logged</span>
        </div>
        <div className="stat-card">
          <strong>{stats.avgRating != null ? stats.avgRating.toFixed(1) : '—'}</strong>
          <span>Avg satisfaction</span>
        </div>
      </div>

      <h3>Top recipes</h3>
      {stats.topRecipes.length === 0 && <p className="empty-state">No servings logged yet.</p>}
      {stats.topRecipes.length > 0 && (
        <ul className="analysis-list">
          {stats.topRecipes.map(({ recipe, count }) => (
            <li key={recipe.id}>
              <Link to={`/recipes/${recipe.id}`}>
                {proteinInfo(recipe.protein) && <span aria-hidden="true">{proteinInfo(recipe.protein).icon} </span>}
                {recipe.title}
              </Link>
              <span>
                {count} serving{count === 1 ? '' : 's'}
              </span>
            </li>
          ))}
        </ul>
      )}

      <h3>Protein variety</h3>
      {stats.servingsByProtein.length === 0 && <p className="empty-state">Not enough data yet.</p>}
      {stats.servingsByProtein.length > 0 && (
        <ul className="analysis-list">
          {stats.servingsByProtein.map(([key, count]) => {
            const info = proteinInfo(key)
            return (
              <li key={key}>
                <span>{info ? `${info.icon} ${info.label}` : 'Unspecified'}</span>
                <span>{count}</span>
              </li>
            )
          })}
        </ul>
      )}

      <h3>Meal types</h3>
      <ul className="analysis-list">
        {stats.servingsByMealType.map(([type, count]) => (
          <li key={type}>
            <span>{capitalize(type)}</span>
            <span>{count}</span>
          </li>
        ))}
      </ul>

      <h3>Freezer alerts</h3>
      <p className="hint">
        {stats.expiredCount} expired · {stats.expiringSoonCount} expiring within 7 days
      </p>
      {stats.lowStock.length === 0 && <p className="empty-state">Nothing running low.</p>}
      {stats.lowStock.length > 0 && (
        <ul className="analysis-list">
          {stats.lowStock.map((batch) => (
            <li key={batch.id}>
              <Link to={`/batches/${batch.id}`}>{batch.recipe?.title ?? 'Unknown recipe'}</Link>
              <span>{batch.portions_remaining} left</span>
            </li>
          ))}
        </ul>
      )}

      {isAdmin && (
        <>
          <h3>Settings</h3>
          <form onSubmit={handleSaveThreshold} className="field">
            <label htmlFor="threshold">Low stock threshold (portions)</label>
            <input
              id="threshold"
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
            />
            <button type="submit" className="button" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </form>
        </>
      )}
    </div>
  )
}
