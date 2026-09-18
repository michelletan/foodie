import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { createRecipe, getRecipe, updateRecipe } from '../lib/data/index.js'
import { MEAL_CATEGORIES } from '../lib/mealCategories.js'

// Structured (name/qty/unit rows) recipes still exist from before this was
// simplified — RecipeDetail.jsx still renders them correctly — but this
// form no longer creates them. Editing an old structured recipe flattens it
// into one text blob here; saving it converts it to freetext, same as
// anything else typed here.
function flattenToText(recipe) {
  if (recipe.format === 'freetext') return recipe.instructions
  const ingredientLines = recipe.ingredients.map((i) => [i.quantity, i.unit, i.name].filter(Boolean).join(' '))
  const parts = [ingredientLines.join('\n'), recipe.instructions]
  if (recipe.notes) parts.push(`Notes: ${recipe.notes}`)
  return parts.filter(Boolean).join('\n\n')
}

export default function RecipeForm() {
  const { id } = useParams()
  const isEditing = Boolean(id)
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [rawText, setRawText] = useState('')
  const [loading, setLoading] = useState(isEditing)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isEditing) return
    getRecipe(id)
      .then((recipe) => {
        setTitle(recipe.title)
        setCategory(recipe.category ?? '')
        setRawText(flattenToText(recipe))
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id, isEditing])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (!title.trim()) return setError('Title is required.')
    if (!rawText.trim()) return setError('Paste or type the recipe.')

    const input = {
      title: title.trim(),
      format: 'freetext',
      ingredients: [],
      instructions: rawText.trim(),
      notes: null,
      category: category || null,
    }

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
          <label htmlFor="title">
            Title<span className="required-mark">*</span>
          </label>
          <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div className="field">
          <label htmlFor="category">Category</label>
          <select id="category" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">No category</option>
            {MEAL_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.icon} {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="rawText">
            Recipe<span className="required-mark">*</span>
          </label>
          <textarea
            id="rawText"
            rows={14}
            placeholder="Paste or type the whole recipe here — ingredients, steps, whatever you've got. It's saved and shown exactly as written."
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
          />
        </div>

        {error && <p className="error">{error}</p>}

        <div className="form-actions sticky-save-bar">
          <button type="submit" className="button" disabled={saving}>
            {saving ? 'Saving…' : 'Save recipe'}
          </button>
        </div>
      </form>
    </div>
  )
}
