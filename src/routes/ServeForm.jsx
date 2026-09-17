import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { listBatches, listRecipes, serveMeal } from '../lib/data/index.js'
import { compressImage } from '../lib/photo.js'

const MEAL_TYPES = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
  { value: 'milk', label: 'Milk' },
]
const RATINGS = [1, 2, 3, 4, 5]

export default function ServeForm() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [batches, setBatches] = useState(null)
  const [recipes, setRecipes] = useState(null)
  const [mealType, setMealType] = useState(null)
  // One meal can draw portions from several freezer batches at once — each
  // entry is its own {batchId, portionsUsed}, saved as its own serving_event
  // row sharing the same meal_type/rating/notes (see handleSubmit).
  const [freezerItems, setFreezerItems] = useState(() => {
    const preselected = searchParams.get('batchId')
    return preselected ? [{ batchId: preselected, portionsUsed: 1 }] : []
  })
  const [description, setDescription] = useState('')
  const [photoBlob, setPhotoBlob] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [compressing, setCompressing] = useState(false)
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

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const availableBatches = useMemo(
    () => batches?.filter((b) => !freezerItems.some((i) => i.batchId === b.id)) ?? [],
    [batches, freezerItems]
  )

  function recipeTitle(recipeId) {
    return recipes?.find((r) => r.id === recipeId)?.title ?? 'Unknown recipe'
  }

  function handleMealTypeChange(value) {
    setMealType(value)
    // Milk doesn't use any of the freezer/description/photo fields, so drop
    // whatever was in them rather than silently submitting stale values.
    if (value === 'milk') {
      setFreezerItems([])
      setDescription('')
      setPhotoBlob(null)
      setPreviewUrl(null)
    }
  }

  function handleAddFreezerItem(newBatchId) {
    if (!newBatchId) return
    setFreezerItems((items) => [...items, { batchId: newBatchId, portionsUsed: 1 }])
  }

  function removeFreezerItem(batchId) {
    setFreezerItems((items) => items.filter((i) => i.batchId !== batchId))
  }

  function adjustFreezerItemPortions(batchId, delta) {
    setFreezerItems((items) =>
      items.map((i) => {
        if (i.batchId !== batchId) return i
        const max = batches.find((b) => b.id === batchId)?.portions_remaining ?? 1
        return { ...i, portionsUsed: Math.min(max, Math.max(1, i.portionsUsed + delta)) }
      })
    )
  }

  async function handlePhotoSelected(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setCompressing(true)
    try {
      const blob = await compressImage(file)
      setPhotoBlob(blob)
      setPreviewUrl(URL.createObjectURL(blob))
    } catch (err) {
      setError(err.message)
    } finally {
      setCompressing(false)
    }
  }

  function handleRetake() {
    setPhotoBlob(null)
    setPreviewUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    fileInputRef.current?.click()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (!mealType) return setError('Tap a meal.')

    // Each freezer item becomes its own serving_event row; a filled-in
    // description becomes one more (batch-less) row. Milk with nothing
    // selected is still exactly one row, just with no batch or description.
    const items = freezerItems.map((i) => ({ batchId: i.batchId, portionsUsed: i.portionsUsed }))
    if (description.trim()) items.push({ batchId: null, portionsUsed: null })
    if (items.length === 0) {
      if (mealType === 'milk') {
        items.push({ batchId: null, portionsUsed: null })
      } else {
        return setError('Select from the freezer or describe what was served.')
      }
    }
    if (!rating) return setError('Tap a rating.')

    setSaving(true)
    let savedCount = 0
    try {
      for (const item of items) {
        await serveMeal({
          batchId: item.batchId,
          portionsUsed: item.portionsUsed,
          mealType,
          description: item.batchId ? null : description.trim() || null,
          // Only attach the photo once, to whichever row saves first —
          // there's one photo per meal, not one per freezer item.
          photoBlob: savedCount === 0 ? photoBlob : null,
          satisfactionRating: rating,
          notes: notes.trim() || null,
        })
        savedCount += 1
      }
      navigate(freezerItems[0] ? `/batches/${freezerItems[0].batchId}` : '/history')
    } catch (err) {
      setError(
        savedCount > 0
          ? `Saved ${savedCount} of ${items.length} items, then: ${err.message}. Check History for what went through.`
          : err.message
      )
      setSaving(false)
    }
  }

  if (!batches || !recipes) return <p>Loading…</p>

  const showDetails = mealType && mealType !== 'milk'

  return (
    <div>
      <h2>Serve food</h2>

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Meal</label>
          <div className="meal-type-options">
            {MEAL_TYPES.map((m) => (
              <button
                key={m.value}
                type="button"
                className={`rating-option meal-type-option${mealType === m.value ? ' selected' : ''}`}
                onClick={() => handleMealTypeChange(m.value)}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {showDetails && (
          <>
            <div className="field">
              <label htmlFor="addBatch">From the freezer (optional)</label>
              <select id="addBatch" value="" onChange={(e) => handleAddFreezerItem(e.target.value)}>
                <option value="">Add a batch…</option>
                {availableBatches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {recipeTitle(b.recipe_id)} — {b.portions_remaining} left
                  </option>
                ))}
              </select>

              {freezerItems.length > 0 && (
                <ul className="freezer-item-list">
                  {freezerItems.map((item) => {
                    const batch = batches.find((b) => b.id === item.batchId)
                    return (
                      <li key={item.batchId} className="freezer-item-row">
                        <span className="freezer-item-title">{recipeTitle(batch?.recipe_id)}</span>
                        <div className="portion-stepper small">
                          <button
                            type="button"
                            onClick={() => adjustFreezerItemPortions(item.batchId, -1)}
                            disabled={item.portionsUsed <= 1}
                          >
                            −
                          </button>
                          <span>{item.portionsUsed}</span>
                          <button
                            type="button"
                            onClick={() => adjustFreezerItemPortions(item.batchId, 1)}
                            disabled={item.portionsUsed >= (batch?.portions_remaining ?? 1)}
                          >
                            +
                          </button>
                        </div>
                        <button
                          type="button"
                          className="freezer-item-remove"
                          aria-label="Remove"
                          onClick={() => removeFreezerItem(item.batchId)}
                        >
                          ✕
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            <div className="field">
              <label htmlFor="description">Description (optional)</label>
              <input
                id="description"
                placeholder="e.g. banana slices"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="field">
              <label>Photo (optional)</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoSelected}
                style={{ display: previewUrl ? 'none' : 'block' }}
              />

              {compressing && <p>Compressing photo…</p>}

              {previewUrl && (
                <div className="photo-preview">
                  <img src={previewUrl} alt="Serving preview" />
                  <button type="button" className="button secondary" onClick={handleRetake}>
                    Retake
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {mealType && (
          <>
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
          <button type="submit" className="button" disabled={saving || compressing || !mealType}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  )
}
