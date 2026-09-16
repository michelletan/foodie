// Single entry point for all data access. Feature code should only ever
// import from here, never from localBackend.js/supabaseBackend.js directly,
// so swapping VITE_DATA_BACKEND is a config change, not a rewrite.
const backend =
  import.meta.env.VITE_DATA_BACKEND === 'supabase'
    ? await import('./supabaseBackend.js')
    : await import('./localBackend.js')

export const {
  listUsers,
  getCurrentUser,
  listChildren,
  listRecipes,
  getRecipe,
  createRecipe,
  updateRecipe,
  listBatches,
  getBatch,
  createBatch,
  voidBatch,
  hardDeleteBatch,
  listServingEvents,
  serveMeal,
  voidServingEvent,
  hardDeleteServingEvent,
  getSettings,
  updateSettings,
  getPhotoUrl,
} = backend

// Local-dev-only: lets a "logged in as" switcher work when there's no real
// auth backend. Undefined when running against Supabase.
export const setCurrentUser = backend.setCurrentUser

// The mirror image: only meaningful with a real auth backend, so
// localBackend.js doesn't export these. Undefined when running locally —
// AuthGate.jsx checks for getSession to decide whether an auth wall
// applies at all.
export const getSession = backend.getSession
export const signIn = backend.signIn
export const signOut = backend.signOut
export const onAuthStateChange = backend.onAuthStateChange
