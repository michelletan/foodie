// Browser-only data backend: localStorage for records, IndexedDB for photo
// blobs, no network. Lets the app run and be clicked through end-to-end
// before a real Supabase project exists. See src/lib/data/index.js for how
// this is selected, and supabaseBackend.js for the real implementation.
import { deletePhoto, getPhoto, putPhoto } from './idb.js'

const DB_KEY = 'foodie_db_v1'
const CURRENT_USER_KEY = 'foodie_current_user_v1'

const SEED_USERS = [
  { id: 'u-parent1', name: 'Parent 1', role: 'admin', telegram_chat_id: null },
  { id: 'u-parent2', name: 'Parent 2', role: 'user', telegram_chat_id: null },
  { id: 'u-helper', name: 'Helper', role: 'user', telegram_chat_id: null },
]

const SEED_CHILDREN = [{ id: 'c-hazel', name: 'Hazel', created_at: new Date().toISOString() }]

function seedDb() {
  return {
    users: SEED_USERS,
    children: SEED_CHILDREN,
    recipes: [],
    batches: [],
    serving_events: [],
    app_settings: { low_stock_threshold: 3 },
  }
}

function loadDb() {
  const raw = localStorage.getItem(DB_KEY)
  if (!raw) {
    const db = seedDb()
    saveDb(db)
    return db
  }
  return JSON.parse(raw)
}

function saveDb(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db))
}

function id() {
  return crypto.randomUUID()
}

function now() {
  return new Date().toISOString()
}

function requireAdmin(user) {
  if (user.role !== 'admin') {
    throw new Error(`Only an admin can do this (current user: ${user.name})`)
  }
}

// --- Session (local dev only — a real deployment replaces this with Supabase Auth) ---

export function listUsers() {
  return Promise.resolve(loadDb().users)
}

export function getCurrentUser() {
  const db = loadDb()
  const savedId = localStorage.getItem(CURRENT_USER_KEY)
  const user = db.users.find((u) => u.id === savedId) ?? db.users[0]
  return Promise.resolve(user)
}

export function setCurrentUser(userId) {
  const db = loadDb()
  if (!db.users.some((u) => u.id === userId)) throw new Error(`Unknown user: ${userId}`)
  localStorage.setItem(CURRENT_USER_KEY, userId)
  return Promise.resolve()
}

// --- Children ---

export function listChildren() {
  return Promise.resolve(loadDb().children)
}

// --- Recipes ---

export async function listRecipes() {
  return loadDb().recipes
}

export async function getRecipe(recipeId) {
  const recipe = loadDb().recipes.find((r) => r.id === recipeId)
  if (!recipe) throw new Error(`Recipe not found: ${recipeId}`)
  return recipe
}

export async function createRecipe({ title, format, ingredients, instructions, notes, protein }) {
  const db = loadDb()
  const user = await getCurrentUser()
  const recipe = {
    id: id(),
    title,
    format: format ?? 'structured',
    ingredients,
    instructions,
    notes: notes ?? null,
    protein: protein ?? null,
    created_by: user.id,
    created_at: now(),
  }
  db.recipes.push(recipe)
  saveDb(db)
  return recipe
}

export async function updateRecipe(recipeId, patch) {
  const db = loadDb()
  const recipe = db.recipes.find((r) => r.id === recipeId)
  if (!recipe) throw new Error(`Recipe not found: ${recipeId}`)
  Object.assign(recipe, patch)
  saveDb(db)
  return recipe
}

// --- Batches ---

export async function listBatches({ childId, recipeId, includeVoided = false } = {}) {
  const db = loadDb()
  return db.batches.filter((b) => {
    if (!includeVoided && b.voided_at) return false
    if (b.deleted_at) return false
    if (childId && b.child_id !== childId) return false
    if (recipeId && b.recipe_id !== recipeId) return false
    return true
  })
}

export async function getBatch(batchId) {
  const batch = loadDb().batches.find((b) => b.id === batchId)
  if (!batch) throw new Error(`Batch not found: ${batchId}`)
  return batch
}

export async function createBatch({ recipeId, childId, portionsTotal, portionSize, expiresAt, photoBlob }) {
  const db = loadDb()
  const user = await getCurrentUser()
  const batchId = id()
  const photoPath = `batches/${batchId}.jpg`

  if (photoBlob) await putPhoto(photoPath, photoBlob)

  const batch = {
    id: batchId,
    recipe_id: recipeId,
    child_id: childId,
    prepared_by: user.id,
    portions_total: portionsTotal,
    portions_remaining: portionsTotal,
    portion_size: portionSize,
    expires_at: expiresAt ?? null,
    photo_path: photoBlob ? photoPath : null,
    prepared_at: now(),
    voided_at: null,
    deleted_at: null,
  }
  db.batches.push(batch)
  saveDb(db)
  return batch
}

export async function voidBatch(batchId) {
  const db = loadDb()
  const batch = db.batches.find((b) => b.id === batchId)
  if (!batch) throw new Error(`Batch not found: ${batchId}`)
  batch.voided_at = now()
  saveDb(db)
  return batch
}

// Zeroes portions_remaining without voiding/deleting — the batch stays
// around for the used-batches view, same as one that was fully served.
export async function throwOutBatch(batchId) {
  const db = loadDb()
  const batch = db.batches.find((b) => b.id === batchId)
  if (!batch) throw new Error(`Batch not found: ${batchId}`)
  batch.portions_remaining = 0
  saveDb(db)
  return batch
}

// --- Serving events ---

export async function listServingEvents({ batchId, includeVoided = false, since } = {}) {
  const db = loadDb()
  return db.serving_events
    .filter((e) => {
      if (!includeVoided && e.voided_at) return false
      if (e.deleted_at) return false
      if (batchId && e.batch_id !== batchId) return false
      if (since && new Date(e.served_at) < new Date(since)) return false
      return true
    })
    .sort((a, b) => new Date(b.served_at) - new Date(a.served_at))
}

// batchId/photoBlob are both optional — a serving can be a tracked freezer
// batch, a free-text description, a photo, or (for mealType 'milk') none of
// the above. ServeForm.jsx enforces the "at least one, unless milk" rule
// before calling this; kept here too as a defense-in-depth check.
export async function serveMeal({
  batchId,
  portionsUsed,
  mealType,
  description,
  photoBlob,
  satisfactionRating,
  notes,
}) {
  const db = loadDb()
  const user = await getCurrentUser()

  if (mealType !== 'milk' && !batchId && !description && !photoBlob) {
    throw new Error('Select from the freezer, describe what was served, or add a photo.')
  }

  let batch = null
  if (batchId) {
    batch = db.batches.find((b) => b.id === batchId)
    if (!batch) throw new Error(`Batch not found: ${batchId}`)
    if (batch.portions_remaining < portionsUsed) {
      throw new Error(`Only ${batch.portions_remaining} portion(s) remaining`)
    }
    batch.portions_remaining -= portionsUsed
  }

  const eventId = id()
  let photoPath = null
  if (photoBlob) {
    photoPath = `servings/${eventId}.jpg`
    await putPhoto(photoPath, photoBlob)
  }

  const event = {
    id: eventId,
    batch_id: batchId ?? null,
    served_by: user.id,
    portions_used: batchId ? portionsUsed : null,
    meal_type: mealType,
    description: description ?? null,
    photo_path: photoPath,
    satisfaction_rating: satisfactionRating ?? null,
    notes: notes ?? null,
    served_at: now(),
    voided_at: null,
    deleted_at: null,
  }
  db.serving_events.push(event)
  saveDb(db)
  return event
}

// Removes a serving event in one step — reinstating any portions it used
// and marking it deleted (never an actual purge, matching batches) —
// instead of the old two-step void-then-admin-hard-delete. Open to any
// user; idempotent if the event was already deleted.
export async function deleteServingEvent(eventId) {
  const db = loadDb()
  const event = db.serving_events.find((e) => e.id === eventId)
  if (!event) throw new Error(`Serving event not found: ${eventId}`)
  if (event.deleted_at) return event

  if (event.batch_id) {
    const batch = db.batches.find((b) => b.id === event.batch_id)
    if (batch) batch.portions_remaining += event.portions_used
  }

  if (event.photo_path) await deletePhoto(event.photo_path)
  event.deleted_at = now()
  saveDb(db)
  return event
}

// --- App settings ---

export async function getSettings() {
  return loadDb().app_settings
}

export async function updateSettings(patch) {
  const db = loadDb()
  const user = await getCurrentUser()
  requireAdmin(user)
  Object.assign(db.app_settings, patch)
  saveDb(db)
  return db.app_settings
}

// --- Photos ---

export async function getPhotoUrl(photoPath) {
  if (!photoPath) return null
  const blob = await getPhoto(photoPath)
  if (!blob) return null
  return URL.createObjectURL(blob)
}

// --- Dev helper (not part of the shared interface) ---

export function resetLocalData() {
  localStorage.removeItem(DB_KEY)
  localStorage.removeItem(CURRENT_USER_KEY)
}
