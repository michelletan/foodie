import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listRecipes } from '../lib/data/index.js'
import { proteinInfo } from '../lib/proteins.js'

const PAGE_SIZE = 20

export default function RecipeList() {
  const [recipes, setRecipes] = useState(null)
  const [search, setSearch] = useState('')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  useEffect(() => {
    listRecipes().then(setRecipes)
  }, [])

  const filtered = recipes?.filter((r) => r.title.toLowerCase().includes(search.trim().toLowerCase()))
  const visible = filtered?.slice(0, visibleCount)

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
        <input
          type="search"
          className="search-input"
          placeholder="Search recipes…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setVisibleCount(PAGE_SIZE)
          }}
          aria-label="Search recipes"
        />
      )}

      {recipes?.length > 0 && filtered?.length === 0 && (
        <p className="empty-state">No recipes match "{search}".</p>
      )}

      {visible?.length > 0 && (
        <>
          <ul className="recipe-list">
            {visible.map((r) => (
              <li key={r.id}>
                <Link to={`/recipes/${r.id}`}>
                  {proteinInfo(r.protein) && <span aria-hidden="true">{proteinInfo(r.protein).icon} </span>}
                  {r.title}
                </Link>
              </li>
            ))}
          </ul>

          {filtered.length > visible.length && (
            <button type="button" className="button secondary load-more" onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}>
              Load more ({filtered.length - visible.length} more)
            </button>
          )}
        </>
      )}
    </div>
  )
}
