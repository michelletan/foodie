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
  const [batchId, setBatchId] = useState(searchParams.get('batchId') ?? '')
  const [portionsUsed, setPortionsUsed] = useState(1)
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

  const selectedBatch = useMemo(() => batches?.find((b) => b.id === batchId) ?? null, [batches, batchId])

  function recipeTitle(recipeId) {
    return recipes?.find((r) => r.id === recipeId)?.title ?? 'Unknown recipe'
  }

  function handleMealTypeChange(value) {
    setMealType(value)
    // Milk doesn't use any of the freezer/description/photo fields, so drop
    // whatever was in them rather than silently submitting stale values.
    if (value === 'milk') {
      setBatchId('')
      setPortionsUsed(1)
      setDescription('')
      setPhotoBlob(null)
      setPreviewUrl(null)
    }
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
    if (mealType !== 'milk' && !batchId && !description.trim()) {
      return setError('Select from the freezer or describe what was served.')
    }
    if (!rating) return setError('Tap a rating.')

    setSaving(true)
    try {
      await serveMeal({
        batchId: batchId || null,
        portionsUsed: batchId ? portionsUsed : null,
        mealType,
        description: description.trim() || null,
        photoBlob,
        satisfactionRating: rating,
        notes: notes.trim() || null,
      })
      navigate(batchId ? `/batches/${batchId}` : '/history')
    } catch (err) {
      setError(err.message)
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
              <label htmlFor="batch">From the freezer (optional)</label>
              <select id="batch" value={batchId} onChange={(e) => handleBatchChange(e.target.value)}>
                <option value="">None</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {recipeTitle(b.recipe_id)} — {b.portions_remaining} left
                  </option>
                ))}
              </select>
            </div>

            {selectedBatch && (
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
            )}

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
