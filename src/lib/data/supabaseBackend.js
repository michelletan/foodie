// Real backend, wired up in M1 (see README roadmap). Every export here must
// match the function signatures in localBackend.js so index.js can swap
// between them with no change to feature code. Implementations will use
// supabaseClient.js once the schema/RLS from M1 lands.

function notImplemented(name) {
  throw new Error(`supabaseBackend.${name} is not implemented yet — see README M1`)
}

export function listUsers() {
  return notImplemented('listUsers')
}

export function getCurrentUser() {
  return notImplemented('getCurrentUser')
}

export function listChildren() {
  return notImplemented('listChildren')
}

export function listRecipes() {
  return notImplemented('listRecipes')
}

export function getRecipe() {
  return notImplemented('getRecipe')
}

export function createRecipe() {
  return notImplemented('createRecipe')
}

export function updateRecipe() {
  return notImplemented('updateRecipe')
}

export function listBatches() {
  return notImplemented('listBatches')
}

export function getBatch() {
  return notImplemented('getBatch')
}

export function createBatch() {
  return notImplemented('createBatch')
}

export function voidBatch() {
  return notImplemented('voidBatch')
}

export function hardDeleteBatch() {
  return notImplemented('hardDeleteBatch')
}

export function listServingEvents() {
  return notImplemented('listServingEvents')
}

export function serveMeal() {
  return notImplemented('serveMeal')
}

export function voidServingEvent() {
  return notImplemented('voidServingEvent')
}

export function hardDeleteServingEvent() {
  return notImplemented('hardDeleteServingEvent')
}

export function getSettings() {
  return notImplemented('getSettings')
}

export function updateSettings() {
  return notImplemented('updateSettings')
}

export function getPhotoUrl() {
  // Will become: supabase.storage.from('batch-photos').createSignedUrl(photoPath, ttl)
  return notImplemented('getPhotoUrl')
}
