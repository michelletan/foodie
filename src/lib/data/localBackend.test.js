import { beforeEach, describe, expect, it } from 'vitest'
import * as backend from './localBackend.js'

const {
  listUsers,
  getCurrentUser,
  setCurrentUser,
  listChildren,
  listRecipes,
  getRecipe,
  createRecipe,
  updateRecipe,
  listBatches,
  getBatch,
  createBatch,
  voidBatch,
  throwOutBatch,
  listServingEvents,
  serveMeal,
  deleteServingEvent,
  getSettings,
  updateSettings,
  getPhotoUrl,
  resetLocalData,
} = backend

beforeEach(() => {
  resetLocalData()
})

describe('seed data', () => {
  it('seeds the 3 spec users and one child', async () => {
    const users = await listUsers()
    expect(users.map((u) => u.name)).toEqual(['Parent 1', 'Parent 2', 'Helper'])
    expect(users.find((u) => u.name === 'Parent 1').role).toBe('admin')
    expect(users.find((u) => u.name === 'Parent 2').role).toBe('user')
    expect(users.find((u) => u.name === 'Helper').role).toBe('user')

    const children = await listChildren()
    expect(children.map((c) => c.name)).toEqual(['Hazel'])
  })

  it('defaults the current user to the first seeded user', async () => {
    const current = await getCurrentUser()
    expect(current.name).toBe('Parent 1')
  })
})

describe('session', () => {
  it('switches and persists the acting user', async () => {
    await setCurrentUser('u-helper')
    expect((await getCurrentUser()).name).toBe('Helper')
  })

  it('rejects switching to an unknown user', () => {
    expect(() => setCurrentUser('nope')).toThrow(/unknown user/i)
  })
})

describe('recipes', () => {
  it('creates a structured recipe attributed to the current user', async () => {
    await setCurrentUser('u-parent2')
    const recipe = await createRecipe({
      title: 'Mashed carrot',
      ingredients: [{ name: 'carrot', quantity: '1', unit: '' }],
      instructions: 'Steam and mash.',
      notes: null,
    })

    expect(recipe.format).toBe('structured')
    expect(recipe.created_by).toBe('u-parent2')
    expect(await getRecipe(recipe.id)).toEqual(recipe)
    expect(await listRecipes()).toContainEqual(recipe)
  })

  it('preserves the freetext format', async () => {
    const recipe = await createRecipe({
      title: 'Grandma special',
      format: 'freetext',
      ingredients: [],
      instructions: 'Everything pasted as one block.',
      notes: null,
    })
    expect(recipe.format).toBe('freetext')
  })

  it('updates a recipe in place', async () => {
    const recipe = await createRecipe({
      title: 'Original',
      ingredients: [{ name: 'x', quantity: '1', unit: '' }],
      instructions: 'do it',
      notes: null,
    })
    const updated = await updateRecipe(recipe.id, { title: 'Renamed' })
    expect(updated.title).toBe('Renamed')
    expect((await getRecipe(recipe.id)).title).toBe('Renamed')
  })

  it('throws for an unknown recipe id', async () => {
    await expect(getRecipe('missing')).rejects.toThrow(/not found/i)
  })

  it('defaults category to null, but stores and updates it when given', async () => {
    const withoutCategory = await createRecipe({
      title: 'Mystery bowl',
      ingredients: [{ name: 'x', quantity: '1', unit: '' }],
      instructions: 'do it',
      notes: null,
    })
    expect(withoutCategory.category).toBeNull()

    const withCategory = await createRecipe({
      title: 'Chicken soup',
      ingredients: [{ name: 'chicken', quantity: '1', unit: '' }],
      instructions: 'do it',
      notes: null,
      category: 'chicken',
    })
    expect(withCategory.category).toBe('chicken')

    const updated = await updateRecipe(withCategory.id, { category: 'beef' })
    expect(updated.category).toBe('beef')
  })
})

async function makeBatch(overrides = {}) {
  const recipe = await createRecipe({
    title: 'Test recipe',
    ingredients: [{ name: 'x', quantity: '1', unit: '' }],
    instructions: 'do it',
    notes: null,
  })
  const children = await listChildren()
  return createBatch({
    recipeId: recipe.id,
    childId: children[0].id,
    portionsTotal: 6,
    portionSize: '125ml',
    ...overrides,
  })
}

describe('batches', () => {
  it('starts portions_remaining equal to portions_total, with no photo', async () => {
    const batch = await makeBatch()
    expect(batch.portions_remaining).toBe(6)
    expect(batch.photo_path).toBeNull()
    expect(await getPhotoUrl(batch.photo_path)).toBeNull()
  })

  it('stores and retrieves the batch photo', async () => {
    const photoBlob = new Blob(['fake jpeg bytes'], { type: 'image/jpeg' })
    const batch = await makeBatch({ photoBlob })
    expect(batch.photo_path).toBe(`batches/${batch.id}.jpg`)
    expect(await getPhotoUrl(batch.photo_path)).toBe('blob:mock-url')
  })

  it('defaults expires_at to null, but stores it when given', async () => {
    const withoutExpiry = await makeBatch()
    expect(withoutExpiry.expires_at).toBeNull()

    const expiresAt = new Date('2026-12-01').toISOString()
    const withExpiry = await makeBatch({ expiresAt })
    expect((await getBatch(withExpiry.id)).expires_at).toBe(expiresAt)
  })

  it('filters listBatches by child and recipe', async () => {
    const batch = await makeBatch()
    const children = await listChildren()
    expect(await listBatches({ childId: children[0].id })).toContainEqual(batch)
    expect(await listBatches({ childId: 'someone-else' })).toEqual([])
    expect(await listBatches({ recipeId: batch.recipe_id })).toContainEqual(batch)
    expect(await listBatches({ recipeId: 'other-recipe' })).toEqual([])
  })

  it('voiding hides a batch from listBatches by default but keeps it directly reachable', async () => {
    const batch = await makeBatch()
    await voidBatch(batch.id)

    expect(await listBatches()).toEqual([])
    expect(await listBatches({ includeVoided: true })).toHaveLength(1)
    expect((await getBatch(batch.id)).voided_at).not.toBeNull()
  })

  it('throwing out a batch zeroes its portions but keeps it (unvoided, undeleted) for reference', async () => {
    const batch = await makeBatch({ portionsTotal: 4 })

    const thrown = await throwOutBatch(batch.id)

    expect(thrown.portions_remaining).toBe(0)
    // listBatches() doesn't filter by portion count — that's a UI concern
    // (FreezerView's own "in stock" filter) — so the record is still listed,
    // just voided_at/deleted_at both stay null.
    expect(await listBatches()).toContainEqual(thrown)
    const stored = await getBatch(batch.id)
    expect(stored.portions_remaining).toBe(0)
    expect(stored.voided_at).toBeNull()
    expect(stored.deleted_at).toBeNull()
  })

})

describe('serving a meal (atomic portion math)', () => {
  it('decrements portions_remaining and records who served it', async () => {
    const batch = await makeBatch()
    await setCurrentUser('u-helper')

    const event = await serveMeal({
      batchId: batch.id,
      portionsUsed: 2,
      mealType: 'lunch',
      satisfactionRating: 5,
      notes: 'yum',
    })

    expect(event.served_by).toBe('u-helper')
    expect(event.portions_used).toBe(2)
    expect(event.meal_type).toBe('lunch')
    expect((await getBatch(batch.id)).portions_remaining).toBe(4)
  })

  it('refuses to serve more portions than remain, without mutating the batch', async () => {
    const batch = await makeBatch({ portionsTotal: 2 })

    await expect(
      serveMeal({ batchId: batch.id, portionsUsed: 3, mealType: 'dinner', satisfactionRating: 3 })
    ).rejects.toThrow(/only 2 portion/i)
    expect((await getBatch(batch.id)).portions_remaining).toBe(2)
  })

  it('deleting a serving event reinstates the batch portions and removes the photo', async () => {
    const photoBlob = new Blob(['fake jpeg bytes'], { type: 'image/jpeg' })
    const batch = await makeBatch()
    const event = await serveMeal({
      batchId: batch.id,
      portionsUsed: 3,
      mealType: 'breakfast',
      satisfactionRating: 4,
      photoBlob,
    })
    expect((await getBatch(batch.id)).portions_remaining).toBe(3)

    const deleted = await deleteServingEvent(event.id)

    expect((await getBatch(batch.id)).portions_remaining).toBe(6)
    expect(deleted.deleted_at).not.toBeNull()
    expect(await getPhotoUrl(event.photo_path)).toBeNull()
    expect(await listServingEvents({ batchId: batch.id, includeVoided: true })).toEqual([])
  })

  it('deleting an already-deleted serving event does not double-restore portions', async () => {
    const batch = await makeBatch()
    const event = await serveMeal({ batchId: batch.id, portionsUsed: 3, mealType: 'breakfast', satisfactionRating: 4 })

    await deleteServingEvent(event.id)
    await deleteServingEvent(event.id)

    expect((await getBatch(batch.id)).portions_remaining).toBe(6)
  })

  it('excludes deleted servings from listServingEvents (with or without includeVoided) and sorts newest first', async () => {
    const batch = await makeBatch({ portionsTotal: 10 })
    const first = await serveMeal({ batchId: batch.id, portionsUsed: 1, mealType: 'breakfast', satisfactionRating: 3 })
    const second = await serveMeal({ batchId: batch.id, portionsUsed: 1, mealType: 'lunch', satisfactionRating: 4 })
    await deleteServingEvent(first.id)

    const visible = await listServingEvents({ batchId: batch.id })
    expect(visible.map((e) => e.id)).toEqual([second.id])

    const withIncludeVoided = await listServingEvents({ batchId: batch.id, includeVoided: true })
    expect(withIncludeVoided.map((e) => e.id)).toEqual([second.id])
  })

  it('deleting a serving event works for a non-admin user (no longer admin-gated)', async () => {
    const batch = await makeBatch()
    const event = await serveMeal({ batchId: batch.id, portionsUsed: 1, mealType: 'dinner', satisfactionRating: 3 })
    await setCurrentUser('u-helper')

    await expect(deleteServingEvent(event.id)).resolves.toBeTruthy()
    expect((await getBatch(batch.id)).portions_remaining).toBe(6)
  })

  it('filters servings by since', async () => {
    const batch = await makeBatch()
    const event = await serveMeal({ batchId: batch.id, portionsUsed: 1, mealType: 'lunch', satisfactionRating: 4 })

    const past = new Date(Date.now() - 60_000).toISOString()
    const future = new Date(Date.now() + 60_000).toISOString()

    expect(await listServingEvents({ since: past })).toContainEqual(event)
    expect(await listServingEvents({ since: future })).not.toContainEqual(event)
  })

  it('logs milk with no batch, description, or photo', async () => {
    const event = await serveMeal({ mealType: 'milk', satisfactionRating: 4 })
    expect(event.batch_id).toBeNull()
    expect(event.portions_used).toBeNull()
    expect(event.description).toBeNull()
  })

  it('logs a free-text serving with no batch', async () => {
    const event = await serveMeal({ mealType: 'snack', description: 'banana slices', satisfactionRating: 5 })
    expect(event.batch_id).toBeNull()
    expect(event.description).toBe('banana slices')
    expect(await listServingEvents()).toContainEqual(event)
  })

  it('refuses a non-milk serving with no batch, description, or photo', async () => {
    await expect(serveMeal({ mealType: 'lunch', satisfactionRating: 3 })).rejects.toThrow(
      /select from the freezer, describe/i
    )
  })

  it('logs a serving with only a photo, no batch or description', async () => {
    const photoBlob = new Blob(['fake jpeg bytes'], { type: 'image/jpeg' })
    const event = await serveMeal({ mealType: 'snack', photoBlob, satisfactionRating: 5 })
    expect(event.batch_id).toBeNull()
    expect(event.description).toBeNull()
    expect(event.photo_path).not.toBeNull()
  })

  it('logs a serving with no satisfaction rating', async () => {
    const batch = await makeBatch()
    const event = await serveMeal({ batchId: batch.id, portionsUsed: 1, mealType: 'lunch' })
    expect(event.satisfaction_rating).toBeNull()
  })
})

describe('app settings', () => {
  it('has a default low stock threshold', async () => {
    expect((await getSettings()).low_stock_threshold).toBe(3)
  })

  it('only an admin can update settings', async () => {
    await setCurrentUser('u-parent2')
    await expect(updateSettings({ low_stock_threshold: 5 })).rejects.toThrow(/admin/i)
  })

  it('persists an admin update', async () => {
    await updateSettings({ low_stock_threshold: 5 })
    expect((await getSettings()).low_stock_threshold).toBe(5)
  })
})

describe('resetLocalData', () => {
  it('wipes back to a fresh seed', async () => {
    await createRecipe({ title: 'x', ingredients: [{ name: 'x', quantity: '1', unit: '' }], instructions: 'x' })
    expect(await listRecipes()).toHaveLength(1)

    resetLocalData()

    expect(await listRecipes()).toHaveLength(0)
    expect((await getCurrentUser()).name).toBe('Parent 1')
  })
})
