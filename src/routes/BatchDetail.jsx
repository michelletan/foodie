import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getBatch, getPhotoUrl, getRecipe, listChildren, listUsers } from '../lib/data/index.js'

export default function BatchDetail() {
  const { id } = useParams()
  const [batch, setBatch] = useState(null)
  const [recipe, setRecipe] = useState(null)
  const [child, setChild] = useState(null)
  const [preparedBy, setPreparedBy] = useState(null)
  const [photoUrl, setPhotoUrl] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    setBatch(null)
    setError(null)
    getBatch(id)
      .then(async (batch) => {
        setBatch(batch)
        const [recipe, children, users, photoUrl] = await Promise.all([
          getRecipe(batch.recipe_id),
          listChildren(),
          listUsers(),
          getPhotoUrl(batch.photo_path),
        ])
        setRecipe(recipe)
        setChild(children.find((c) => c.id === batch.child_id) ?? null)
        setPreparedBy(users.find((u) => u.id === batch.prepared_by) ?? null)
        setPhotoUrl(photoUrl)
      })
      .catch((e) => setError(e.message))
  }, [id])

  if (error) return <p className="error">{error}</p>
  if (!batch) return <p>Loading…</p>

  return (
    <div className="batch-detail">
      <div className="page-header">
        <h2>{recipe?.title ?? 'Batch'}</h2>
        <Link className="button secondary" to={`/recipes/${batch.recipe_id}`}>
          View recipe
        </Link>
      </div>

      {batch.voided_at && <p className="error">This batch has been voided.</p>}

      {photoUrl && (
        <div className="batch-photo">
          <img src={photoUrl} alt={recipe?.title ?? 'Batch photo'} />
        </div>
      )}

      <dl>
        <dt>Child</dt>
        <dd>{child?.name ?? 'Unknown'}</dd>
        <dt>Portions remaining</dt>
        <dd>
          {batch.portions_remaining} / {batch.portions_total}
        </dd>
        <dt>Portion size</dt>
        <dd>{batch.portion_size ?? '—'}</dd>
        <dt>Prepared by</dt>
        <dd>{preparedBy?.name ?? 'Unknown'}</dd>
        <dt>Prepared</dt>
        <dd>{new Date(batch.prepared_at).toLocaleString()}</dd>
      </dl>
    </div>
  )
}
