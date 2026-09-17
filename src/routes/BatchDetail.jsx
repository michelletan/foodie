import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  getBatch,
  getCurrentUser,
  getPhotoUrl,
  getRecipe,
  hardDeleteBatch,
  hardDeleteServingEvent,
  listChildren,
  listServingEvents,
  listUsers,
  throwOutBatch,
  voidBatch,
  voidServingEvent,
} from '../lib/data/index.js'
import { satisfactionFace, satisfactionLabel } from '../lib/satisfaction.js'

export default function BatchDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [batch, setBatch] = useState(null)
  const [recipe, setRecipe] = useState(null)
  const [child, setChild] = useState(null)
  const [users, setUsers] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [photoUrl, setPhotoUrl] = useState(null)
  const [servingEvents, setServingEvents] = useState([])
  const [error, setError] = useState(null)

  async function refresh() {
    const [batch, users, currentUser, events] = await Promise.all([
      getBatch(id),
      listUsers(),
      getCurrentUser(),
      listServingEvents({ batchId: id, includeVoided: true }),
    ])
    setBatch(batch)
    setUsers(users)
    setCurrentUser(currentUser)
    setServingEvents(
      await Promise.all(events.map(async (e) => ({ ...e, photoUrl: await getPhotoUrl(e.photo_path) })))
    )

    const [recipe, children, photoUrl] = await Promise.all([
      getRecipe(batch.recipe_id),
      listChildren(),
      getPhotoUrl(batch.photo_path),
    ])
    setRecipe(recipe)
    setChild(children.find((c) => c.id === batch.child_id) ?? null)
    setPhotoUrl(photoUrl)
  }

  useEffect(() => {
    setBatch(null)
    setError(null)
    refresh().catch((e) => setError(e.message))
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- refresh reads `id` via closure; only `id` changing should re-trigger it
  }, [id])

  function userName(userId) {
    return users.find((u) => u.id === userId)?.name ?? 'Unknown'
  }

  function capitalize(s) {
    return s ? s[0].toUpperCase() + s.slice(1) : s
  }

  async function handleVoidBatch() {
    if (!confirm('Delete this batch? It will be hidden from the freezer view but kept in the record.')) return
    try {
      await voidBatch(batch.id)
      await refresh()
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleThrowOutBatch() {
    if (
      !confirm(
        'Throw out the rest of this batch? Portions remaining will drop to 0 and it will disappear from the freezer view, but it stays in your history.'
      )
    )
      return
    try {
      await throwOutBatch(batch.id)
      await refresh()
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleHardDeleteBatch() {
    if (!confirm('Permanently delete this batch? This cannot be undone.')) return
    try {
      await hardDeleteBatch(batch.id)
      navigate(`/recipes/${batch.recipe_id}`)
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleVoidServingEvent(eventId) {
    if (!confirm('Delete this serving? Its portions will be added back to the batch.')) return
    try {
      await voidServingEvent(eventId)
      await refresh()
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleHardDeleteServingEvent(eventId) {
    if (!confirm('Permanently delete this serving record? This cannot be undone.')) return
    try {
      await hardDeleteServingEvent(eventId)
      await refresh()
    } catch (e) {
      setError(e.message)
    }
  }

  if (error) return <p className="error">{error}</p>
  if (!batch) return <p>Loading…</p>

  const isAdmin = currentUser?.role === 'admin'

  return (
    <div className="batch-detail">
      <div className="page-header">
        <h2>{recipe?.title ?? 'Batch'}</h2>
        <div className="button-group">
          {batch.portions_remaining > 0 && !batch.voided_at && (
            <Link className="button" to={`/serve?batchId=${batch.id}`}>
              Serve
            </Link>
          )}
          <Link className="button secondary" to={`/recipes/${batch.recipe_id}`}>
            View recipe
          </Link>
        </div>
      </div>

      {batch.voided_at && <p className="error">This batch has been deleted.</p>}

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
        <dt>Expires</dt>
        <dd>{batch.expires_at ? new Date(batch.expires_at).toLocaleDateString() : '—'}</dd>
        <dt>Prepared by</dt>
        <dd>{userName(batch.prepared_by)}</dd>
        <dt>Prepared</dt>
        <dd>{new Date(batch.prepared_at).toLocaleString()}</dd>
      </dl>

      <div className="button-group">
        {!batch.voided_at && (
          <button type="button" className="button secondary" onClick={handleVoidBatch}>
            Delete
          </button>
        )}
        {batch.portions_remaining > 0 && !batch.voided_at && (
          <button type="button" className="button secondary" onClick={handleThrowOutBatch}>
            Throw out
          </button>
        )}
        {isAdmin && servingEvents.length === 0 && (
          <button type="button" className="button danger" onClick={handleHardDeleteBatch}>
            Delete permanently
          </button>
        )}
      </div>

      {isAdmin && servingEvents.length > 0 && (
        <p className="hint">
          Delete permanently is only for batches that were mistakenly created and never served from — this one has
          servings logged below, so use delete or throw out instead.
        </p>
      )}

      <h3>Servings</h3>
      {servingEvents.length === 0 && <p className="empty-state">No servings logged yet.</p>}
      {servingEvents.length > 0 && (
        <ul className="serving-list">
          {servingEvents.map((event) => (
            <li key={event.id} className={event.voided_at ? 'voided' : ''}>
              <div className="serving-summary">
                <strong>
                  {event.portions_used} portion{event.portions_used === 1 ? '' : 's'}
                </strong>{' '}
                · {capitalize(event.meal_type)} ·{' '}
                <span title={satisfactionLabel(event.satisfaction_rating)}>
                  {satisfactionFace(event.satisfaction_rating)}
                </span>{' '}
                · {userName(event.served_by)} ·{' '}
                {new Date(event.served_at).toLocaleString()}
                {event.voided_at && ' · deleted'}
              </div>
              {event.description && <div className="serving-notes">{event.description}</div>}
              {event.notes && <div className="serving-notes">{event.notes}</div>}
              {event.photoUrl && (
                <img className="serving-photo" src={event.photoUrl} alt="" />
              )}
              <div className="button-group">
                {!event.voided_at && (
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => handleVoidServingEvent(event.id)}
                  >
                    Delete
                  </button>
                )}
                {isAdmin && (
                  <button
                    type="button"
                    className="button danger"
                    onClick={() => handleHardDeleteServingEvent(event.id)}
                  >
                    Delete permanently
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
