import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listRecipes } from '../lib/data/index.js'

export default function RecipeList() {
  const [recipes, setRecipes] = useState(null)

  useEffect(() => {
    listRecipes().then(setRecipes)
  }, [])

  return (
    <div>
      <div className="page-header">
        <h2>Recipes</h2>
        <Link className="button" to="/recipes/new">
          New recipe
        </Link>
      </div>

      {recipes === null && <p>Loading…</p>}

      {recipes?.length === 0 && (
        <p className="empty-state">No recipes yet — add the first one.</p>
      )}

      {recipes?.length > 0 && (
        <ul className="recipe-list">
          {recipes.map((r) => (
            <li key={r.id}>
              <Link to={`/recipes/${r.id}`}>{r.title}</Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
