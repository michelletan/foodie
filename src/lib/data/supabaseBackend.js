// Real backend. Every export here matches the function signatures in
// localBackend.js so index.js can swap between them with no change to
// feature code. Reads go straight through RLS-gated SELECTs; every
// mutation besides a plain insert calls one of the SECURITY DEFINER
// Postgres functions in supabase/migrations/0003_functions.sql (atomic
// portion math, admin checks) — see that file for why.
import { supabase } from '../supabaseClient.js'

const PHOTO_BUCKET = 'batch-photos'
const SIGNED_URL_TTL_SECONDS = 60 * 60

function unwrap({ data, error }) {
  if (error) throw new Error(error.message)
  return data
}

// --- Session ---

export async function listUsers() {
  return unwrap(await supabase.from('users').select('*'))
}

export async function getCurrentUser() {
  return unwrap(await supabase.rpc('current_app_user'))
}

// setCurrentUser is intentionally not exported — auth is real here
// (supabase.auth.signIn*), not a dev dropdown. See UserSwitcher.jsx,
// which renders nothing when this is undefined.
//
// getSession/signIn/signOut/onAuthStateChange are the mirror image: only
// meaningful when there's a real auth backend, so localBackend.js doesn't
// export them. AuthGate.jsx checks for getSession to decide whether an
// auth wall applies at all.

export async function getSession() {
  const { data } = await supabase.auth.getSession()
  return data.session
}

export async function signIn({ email, password }) {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(error.message)
}

export async function signOut() {
  await supabase.auth.signOut()
}

export function onAuthStateChange(callback) {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => callback(session))
  return () => subscription.unsubscribe()
}

// --- Children ---

export async function listChildren() {
  return unwrap(await supabase.from('children').select('*'))
}

// --- Recipes ---

export async function listRecipes() {
  return unwrap(await supabase.from('recipes').select('*').order('created_at', { ascending: true }))
}

export async function getRecipe(recipeId) {
  return unwrap(await supabase.from('recipes').select('*').eq('id', recipeId).single())
}

export async function createRecipe({ title, format, ingredients, instructions, notes }) {
  return unwrap(
    await supabase
      .from('recipes')
      .insert({ title, format: format ?? 'structured', ingredients, instructions, notes: notes ?? null })
      .select()
      .single()
  )
}

export async function updateRecipe(recipeId, patch) {
  return unwrap(await supabase.from('recipes').update(patch).eq('id', recipeId).select().single())
}

// --- Batches ---

export async function listBatches({ childId, recipeId, includeVoided = false } = {}) {
  let query = supabase.from('batches').select('*').is('deleted_at', null)
  if (!includeVoided) query = query.is('voided_at', null)
  if (childId) query = query.eq('child_id', childId)
  if (recipeId) query = query.eq('recipe_id', recipeId)
  return unwrap(await query)
}

export async function getBatch(batchId) {
  return unwrap(await supabase.from('batches').select('*').eq('id', batchId).single())
}

export async function createBatch({ recipeId, childId, portionsTotal, portionSize, expiresAt, photoBlob }) {
  const batchId = crypto.randomUUID()
  const photoPath = `batches/${batchId}.jpg`

  if (photoBlob) {
    const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(photoPath, photoBlob, {
      contentType: photoBlob.type || 'image/jpeg',
    })
    if (error) throw new Error(error.message)
  }

  return unwrap(
    await supabase
      .from('batches')
      .insert({
        id: batchId,
        recipe_id: recipeId,
        child_id: childId,
        portions_total: portionsTotal,
        portions_remaining: portionsTotal,
        portion_size: portionSize,
        expires_at: expiresAt ?? null,
        photo_path: photoBlob ? photoPath : null,
      })
      .select()
      .single()
  )
}

export async function voidBatch(batchId) {
  return unwrap(await supabase.rpc('void_batch', { p_batch_id: batchId }))
}

export async function hardDeleteBatch(batchId) {
  const batch = await getBatch(batchId)
  const result = unwrap(await supabase.rpc('hard_delete_batch', { p_batch_id: batchId }))
  if (batch.photo_path) await supabase.storage.from(PHOTO_BUCKET).remove([batch.photo_path])
  return result
}

// --- Serving events ---

export async function listServingEvents({ batchId, includeVoided = false, since } = {}) {
  let query = supabase
    .from('serving_events')
    .select('*')
    .is('deleted_at', null)
    .order('served_at', { ascending: false })
  if (!includeVoided) query = query.is('voided_at', null)
  if (batchId) query = query.eq('batch_id', batchId)
  if (since) query = query.gte('served_at', since)
  return unwrap(await query)
}

export async function serveMeal({
  batchId,
  portionsUsed,
  mealType,
  description,
  photoBlob,
  satisfactionRating,
  notes,
}) {
  let photoPath = null
  if (photoBlob) {
    photoPath = `servings/${crypto.randomUUID()}.jpg`
    const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(photoPath, photoBlob, {
      contentType: photoBlob.type || 'image/jpeg',
    })
    if (error) throw new Error(error.message)
  }

  return unwrap(
    await supabase.rpc('serve_meal', {
      p_batch_id: batchId ?? null,
      p_portions_used: batchId ? portionsUsed : null,
      p_meal_type: mealType,
      p_description: description ?? null,
      p_photo_path: photoPath,
      p_satisfaction_rating: satisfactionRating,
      p_notes: notes ?? null,
    })
  )
}

export async function voidServingEvent(eventId) {
  return unwrap(await supabase.rpc('void_serving_event', { p_event_id: eventId }))
}

export async function hardDeleteServingEvent(eventId) {
  const { data: event } = await supabase.from('serving_events').select('photo_path').eq('id', eventId).single()
  const result = unwrap(await supabase.rpc('hard_delete_serving_event', { p_event_id: eventId }))
  if (event?.photo_path) await supabase.storage.from(PHOTO_BUCKET).remove([event.photo_path])
  return result
}

// --- App settings ---

export async function getSettings() {
  return unwrap(await supabase.from('app_settings').select('*').eq('id', true).single())
}

export async function updateSettings(patch) {
  return unwrap(await supabase.rpc('update_settings', { p_low_stock_threshold: patch.low_stock_threshold }))
}

// --- Photos ---

export async function getPhotoUrl(photoPath) {
  if (!photoPath) return null
  const { data, error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .createSignedUrl(photoPath, SIGNED_URL_TTL_SECONDS)
  if (error) return null
  return data.signedUrl
}
