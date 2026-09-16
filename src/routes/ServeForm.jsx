import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { listBatches, listRecipes, serveMeal } from '../lib/data/index.js'

const RATINGS = [1, 2, 3, 4, 5]

export default function ServeForm() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const [batches, setBatches] = useState(null)
  const [recipes, setRecipes] = useState(null)
  const [batchId, setBatchId] = useState(searchParams.get('batchId') ?? '')
  const [portionsUsed, setPortionsUsed] = useState(1)
  const [rating, setRating] = useState(null)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    Promise.all([listBatches(), listRecipes()]).then(([allBatches, allRecipes]) => {
      setBatches(allBatches.filter((b) => b.portions_remaining > 0))
      setRecipes(allRecipes)
    })
  }, [])

  const selectedBatch = useMemo(() => batches?.find((b) => b.id === batchId) ?? null, [batches, batchId])

  function recipeTitle(recipeId) {
    return recipes?.find((r) => r.id === recipeId)?.title ?? 'Unknown recipe'
  }

  function handleBatchChange(newBatchId) {
    setBatchId(newBatchId)
    setPortionsUsed(1)
  }

  function decrementPortions() {
    setPortionsUsed((n) => Math.max(1, n - 1))
  }

  function incrementPortions() {
    const max = selectedBatch?.portions_remaining ?? 1
    setPortionsUsed((n) => Math.min(max, n + 1))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (!batchId) return setError('Select a batch.')
    if (!rating) return setError('Tap a rating.')

    setSaving(true)
    try {
      await serveMeal({ batchId, portionsUsed, satisfactionRating: rating, notes: notes.trim() || null })
      navigate(`/batches/${batchId}`)
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  if (!batches || !recipes) return <p>Loading…</p>

  return (
    <div>
      <h2>Serve a meal</h2>

      {batches.length === 0 && <p className="empty-state">No batches with portions remaining.</p>}

      {batches.length > 0 && (
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="batch">Batch</label>
            <select id="batch" value={batchId} onChange={(e) => handleBatchChange(e.target.value)}>
              <option value="">Select a batch…</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {recipeTitle(b.recipe_id)} — {b.portions_remaining} left
                </option>
              ))}
            </select>
          </div>

          {selectedBatch && (
            <>
              <div className="field">
                <label>Portions served</label>
                <div className="portion-stepper">
                  <button type="button" onClick={decrementPortions} disabled={portionsUsed <= 1}>
                    −
                  </button>
                  <span>{portionsUsed}</span>
                  <button
                    type="button"
                    onClick={incrementPortions}
                    disabled={portionsUsed >= selectedBatch.portions_remaining}
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="field">
                <label>Satisfaction</label>
                <div className="rating-options">
                  {RATINGS.map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={`rating-option${rating === n ? ' selected' : ''}`}
                      onClick={() => setRating(n)}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div className="field">
                <label htmlFor="serveNotes">Note (optional)</label>
                <input id="serveNotes" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </>
          )}

          {error && <p className="error">{error}</p>}

          <div className="form-actions">
            <button type="submit" className="button" disabled={saving || !selectedBatch}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
