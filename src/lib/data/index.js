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
