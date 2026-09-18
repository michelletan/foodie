import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { createBatch, listChildren, listRecipes } from '../lib/data/index.js'
import { compressImage } from '../lib/photo.js'

const QUICK_PORTION_SIZES = [
  { label: '90ml', value: '90ml' },
  { label: '125ml', value: '125ml' },
  { label: '250ml', value: '250ml' },
  { label: '1 tbsp (15ml)', value: '15ml' },
  { label: '2 tbsp (30ml)', value: '30ml' },
]

// yyyy-mm-dd, for direct use as an <input type="date"> value.
function monthsFromToday(n) {
  const d = new Date()
  d.setMonth(d.getMonth() + n)
  return d.toISOString().slice(0, 10)
}

const QUICK_EXPIRY_OPTIONS = [
  { label: '1 month', value: monthsFromToday(1) },
  { label: '2 months', value: monthsFromToday(2) },
  { label: '3 months', value: monthsFromToday(3) },
]

export default function BatchForm() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [recipes, setRecipes] = useState(null)
  const [children, setChildren] = useState(null)
  const [recipeId, setRecipeId] = useState(searchParams.get('recipeId') ?? '')
  const [childId, setChildId] = useState('')
  const [portionsTotal, setPortionsTotal] = useState('')
  const [portionSize, setPortionSize] = useState('')
  const [expiresAt, setExpiresAt] = useState(QUICK_EXPIRY_OPTIONS[0].value)
  const [photoBlob, setPhotoBlob] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [compressing, setCompressing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    listRecipes().then(setRecipes)
    listChildren().then((cs) => {
      setChildren(cs)
      if (cs.length === 1) setChildId(cs[0].id)
    })
  }, [])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

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

    const portions = Number(portionsTotal)
    if (!recipeId) return setError('Select a recipe.')
    if (!childId) return setError('Select a child.')
    if (!Number.isInteger(portions) || portions < 1) return setError('Enter a valid number of portions.')
    if (!portionSize.trim()) return setError('Enter or select a portion size.')
    if (!expiresAt) return setError('Select an expiry date.')

    setSaving(true)
    try {
      const batch = await createBatch({
        recipeId,
        childId,
        portionsTotal: portions,
        portionSize: portionSize.trim(),
        expiresAt: new Date(expiresAt).toISOString(),
        photoBlob,
      })
      navigate(`/batches/${batch.id}`)
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  if (!recipes || !children) return <p>Loading…</p>

  return (
    <div>
      <h2>Log a batch</h2>

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="recipe">
            Recipe<span className="required-mark">*</span>
          </label>
          <select id="recipe" value={recipeId} onChange={(e) => setRecipeId(e.target.value)}>
            <option value="">Select a recipe…</option>
            {recipes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title}
              </option>
            ))}
          </select>
        </div>

        {children.length > 1 && (
          <div className="field">
            <label htmlFor="child">
              Child<span className="required-mark">*</span>
            </label>
            <select id="child" value={childId} onChange={(e) => setChildId(e.target.value)}>
              <option value="">Select a child…</option>
              {children.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="field">
          <label htmlFor="portions">
            Portions made<span className="required-mark">*</span>
          </label>
          <input
            id="portions"
            type="number"
            inputMode="numeric"
            min="1"
            step="1"
            value={portionsTotal}
            onChange={(e) => setPortionsTotal(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="portionSize">
            Portion size<span className="required-mark">*</span>
          </label>
          <input
            id="portionSize"
            placeholder="e.g. 125ml"
            value={portionSize}
            onChange={(e) => setPortionSize(e.target.value)}
          />
          <div className="quick-options">
            {QUICK_PORTION_SIZES.map((size) => (
              <button
                key={size.value}
                type="button"
                className={`quick-option${portionSize === size.value ? ' selected' : ''}`}
                onClick={() => setPortionSize(size.value)}
              >
                {size.label}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label htmlFor="expiresAt">
            Expiry date<span className="required-mark">*</span>
          </label>
          <input
            id="expiresAt"
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
          />
          <div className="quick-options">
            {QUICK_EXPIRY_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                type="button"
                className={`quick-option${expiresAt === opt.value ? ' selected' : ''}`}
                onClick={() => setExpiresAt(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Photo</label>
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
              <img src={previewUrl} alt="Batch preview" />
              <button type="button" className="button secondary" onClick={handleRetake}>
                Retake
              </button>
            </div>
          )}
        </div>

        {error && <p className="error">{error}</p>}

        <div className="form-actions">
          <button type="submit" className="button" disabled={saving || compressing}>
            {saving ? 'Saving…' : 'Save batch'}
          </button>
        </div>
      </form>
    </div>
  )
}
