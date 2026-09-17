import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { createRecipe, getRecipe, updateRecipe } from '../lib/data/index.js'
import { PROTEINS } from '../lib/proteins.js'

const EMPTY_INGREDIENT = { name: '', quantity: '', unit: '' }

export default function RecipeForm() {
  const { id } = useParams()
  const isEditing = Boolean(id)
  const navigate = useNavigate()

  const [format, setFormat] = useState('structured')
  const [title, setTitle] = useState('')
  const [protein, setProtein] = useState('')
  const [ingredients, setIngredients] = useState([{ ...EMPTY_INGREDIENT }])
  const [instructions, setInstructions] = useState('')
  const [notes, setNotes] = useState('')
  const [rawText, setRawText] = useState('')
  const [loading, setLoading] = useState(isEditing)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isEditing) return
    getRecipe(id)
      .then((recipe) => {
        const recipeFormat = recipe.format ?? 'structured'
        setFormat(recipeFormat)
        setTitle(recipe.title)
        setProtein(recipe.protein ?? '')
        if (recipeFormat === 'freetext') {
          setRawText(recipe.instructions)
        } else {
          setIngredients(recipe.ingredients.length ? recipe.ingredients : [{ ...EMPTY_INGREDIENT }])
          setInstructions(recipe.instructions)
          setNotes(recipe.notes ?? '')
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id, isEditing])

  function updateIngredient(index, field, value) {
    setIngredients((rows) => rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)))
  }

  function addIngredientRow() {
    setIngredients((rows) => [...rows, { ...EMPTY_INGREDIENT }])
  }

  function removeIngredientRow(index) {
    setIngredients((rows) => rows.filter((_, i) => i !== index))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (!title.trim()) return setError('Title is required.')

    let input
    if (format === 'freetext') {
      if (!rawText.trim()) return setError('Paste the recipe text.')
      input = { title: title.trim(), format: 'freetext', ingredients: [], instructions: rawText.trim(), notes: null }
    } else {
      const cleanIngredients = ingredients
        .map((row) => ({ ...row, name: row.name.trim() }))
        .filter((row) => row.name)
      if (cleanIngredients.length === 0) return setError('Add at least one ingredient.')
      if (!instructions.trim()) return setError('Instructions are required.')
      input = {
        title: title.trim(),
        format: 'structured',
        ingredients: cleanIngredients,
        instructions: instructions.trim(),
        notes: notes.trim() || null,
      }
    }

    input.protein = protein || null

    setSaving(true)
    try {
      const recipe = isEditing ? await updateRecipe(id, input) : await createRecipe(input)
      navigate(`/recipes/${recipe.id}`)
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  if (loading) return <p>Loading…</p>

  return (
    <div>
      <h2>{isEditing ? 'Edit recipe' : 'New recipe'}</h2>

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="title">Title</label>
          <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div className="field">
          <label>Protein</label>
          <div className="quick-options">
            {PROTEINS.map((p) => (
              <button
                key={p.value}
                type="button"
                className={`quick-option${protein === p.value ? ' selected' : ''}`}
                onClick={() => setProtein(protein === p.value ? '' : p.value)}
              >
                {p.icon} {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Format</label>
          <div className="quick-options">
            <button
              type="button"
              className={`quick-option${format === 'structured' ? ' selected' : ''}`}
              onClick={() => setFormat('structured')}
            >
              Structured
            </button>
            <button
              type="button"
              className={`quick-option${format === 'freetext' ? ' selected' : ''}`}
              onClick={() => setFormat('freetext')}
            >
              Free text
            </button>
          </div>
        </div>

        {format === 'freetext' && (
          <div className="field">
            <label htmlFor="rawText">Recipe text</label>
            <textarea
              id="rawText"
              rows={14}
              placeholder="Paste the whole recipe here — it will be saved and shown exactly as pasted."
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
            />
          </div>
        )}

        {format === 'structured' && (
          <>
            <div className="field">
              <label>Ingredients</label>
              <div className="ingredient-rows">
                {ingredients.map((row, i) => (
                  <div className="ingredient-row" key={i}>
                    <input
                      placeholder="Name"
                      value={row.name}
                      onChange={(e) => updateIngredient(i, 'name', e.target.value)}
                    />
                    <input
                      placeholder="Qty"
                      value={row.quantity}
                      onChange={(e) => updateIngredient(i, 'quantity', e.target.value)}
                    />
                    <input
                      placeholder="Unit"
                      value={row.unit}
                      onChange={(e) => updateIngredient(i, 'unit', e.target.value)}
                    />
                    <button
                      type="button"
                      aria-label="Remove ingredient"
                      onClick={() => removeIngredientRow(i)}
                      disabled={ingredients.length === 1}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" className="button secondary" onClick={addIngredientRow} style={{ marginTop: 8 }}>
                Add ingredient
              </button>
            </div>

            <div className="field">
              <label htmlFor="instructions">Instructions</label>
              <textarea
                id="instructions"
                rows={6}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="notes">Notes (optional)</label>
              <textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </>
        )}

        {error && <p className="error">{error}</p>}

        <div className="form-actions">
          <button type="submit" className="button" disabled={saving}>
            {saving ? 'Saving…' : 'Save recipe'}
          </button>
        </div>
      </form>
    </div>
  )
}
