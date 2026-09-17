import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getRecipe, listUsers } from '../lib/data/index.js'
import { proteinInfo } from '../lib/proteins.js'

export default function RecipeDetail() {
  const { id } = useParams()
  const [recipe, setRecipe] = useState(null)
  const [author, setAuthor] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    setRecipe(null)
    setError(null)
    Promise.all([getRecipe(id), listUsers()])
      .then(([recipe, users]) => {
        setRecipe(recipe)
        setAuthor(users.find((u) => u.id === recipe.created_by) ?? null)
      })
      .catch((e) => setError(e.message))
  }, [id])

  if (error) return <p className="error">{error}</p>
  if (!recipe) return <p>Loading…</p>

  const protein = proteinInfo(recipe.protein)

  return (
    <div className="recipe-detail">
      <div className="page-header">
        <h2>
          {protein && <span aria-hidden="true">{protein.icon} </span>}
          {recipe.title}
        </h2>
        <div className="button-group">
          <Link className="button" to={`/batches/new?recipeId=${recipe.id}`}>
            Log batch
          </Link>
          <Link className="button secondary" to={`/recipes/${recipe.id}/edit`}>
            Edit
          </Link>
        </div>
      </div>

      <dl>
        {protein && (
          <>
            <dt>Protein</dt>
            <dd>
              {protein.icon} {protein.label}
            </dd>
          </>
        )}
        <dt>Added by</dt>
        <dd>{author?.name ?? 'Unknown'}</dd>
        <dt>Added</dt>
        <dd>{new Date(recipe.created_at).toLocaleDateString()}</dd>
      </dl>

      {recipe.format === 'freetext' ? (
        <p className="instructions">{recipe.instructions}</p>
      ) : (
        <>
          <h3>Ingredients</h3>
          <ul className="ingredients">
            {recipe.ingredients.map((ing, i) => (
              <li key={i}>
                {ing.quantity} {ing.unit} {ing.name}
              </li>
            ))}
          </ul>

          <h3>Instructions</h3>
          <p className="instructions">{recipe.instructions}</p>

          {recipe.notes && (
            <>
              <h3>Notes</h3>
              <p className="notes">{recipe.notes}</p>
            </>
          )}
        </>
      )}
    </div>
  )
}
