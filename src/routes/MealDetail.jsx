import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getPhotoUrl, listBatches, listRecipes, listServingEvents, listUsers } from '../lib/data/index.js'
import { capitalize, formatDate, formatTime, groupRows } from '../lib/mealGroups.js'
import { satisfactionFace, satisfactionLabel } from '../lib/satisfaction.js'

export default function MealDetail() {
  const { eventId } = useParams()
  const [group, setGroup] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    setGroup(null)
    setError(null)

    async function load() {
      const [events, batches, recipes, users] = await Promise.all([
        listServingEvents({ includeVoided: true }),
        listBatches({ includeVoided: true }),
        listRecipes(),
        listUsers(),
      ])

      const batchById = new Map(batches.map((b) => [b.id, b]))
      const recipeById = new Map(recipes.map((r) => [r.id, r]))
      const userById = new Map(users.map((u) => [u.id, u]))

      const rows = await Promise.all(
        events.map(async (event) => {
          const batch = batchById.get(event.batch_id)
          return {
            event,
            title: (batch && recipeById.get(batch.recipe_id)?.title) ?? event.description ?? capitalize(event.meal_type),
            servedByName: userById.get(event.served_by)?.name ?? 'Unknown',
            photoUrl: await getPhotoUrl(event.photo_path),
          }
        })
      )

      const found = groupRows(rows).find((g) => g.items.some((i) => i.event.id === eventId))
      if (!found) throw new Error('Meal not found.')
      setGroup(found)
    }

    load().catch((e) => setError(e.message))
  }, [eventId])

  if (error) return <p className="error">{error}</p>
  if (!group) return <p>Loading…</p>

  const batchItems = group.items.filter((i) => i.event.batch_id)
  const freeText = [
    ...group.items.filter((i) => !i.event.batch_id && i.event.description).map((i) => i.event.description),
    group.notes,
  ].filter(Boolean)

  return (
    <div>
      <div className="page-header">
        <h2>Meal details</h2>
      </div>

      <dl>
        <dt>Date</dt>
        <dd>
          {formatDate(group.servedAt)} at {formatTime(group.servedAt)}
        </dd>
        <dt>Meal</dt>
        <dd>{capitalize(group.mealType)}</dd>
        <dt>Served by</dt>
        <dd>{group.servedByName}</dd>
        <dt>Satisfaction</dt>
        <dd>
          <span title={satisfactionLabel(group.rating)}>{satisfactionFace(group.rating)}</span>
        </dd>
      </dl>

      {batchItems.length > 0 && (
        <div className="field">
          <label>From the freezer</label>
          <ul className="recipe-list">
            {batchItems.map((item) => (
              <li key={item.event.batch_id}>
                <Link to={`/batches/${item.event.batch_id}`}>{item.title}</Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {freeText.map((text, i) => (
        <p key={i} className="serving-notes">
          {text}
        </p>
      ))}

      {group.photoUrl && <img className="serving-photo" src={group.photoUrl} alt="" />}
    </div>
  )
}
