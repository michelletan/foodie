// Shared between RecipeForm/RecipeList/RecipeDetail. Values must match the
// check constraint on recipes.protein (0009_recipe_protein.sql).
export const PROTEINS = [
  { value: 'beef', label: 'Beef', icon: '🥩' },
  { value: 'chicken', label: 'Chicken', icon: '🍗' },
  { value: 'pork', label: 'Pork', icon: '🐷' },
  { value: 'fish', label: 'Fish', icon: '🐟' },
  { value: 'egg', label: 'Egg', icon: '🥚' },
  { value: 'vegetarian', label: 'Vegetarian', icon: '🥦' },
  { value: 'other', label: 'Other', icon: '🍽️' },
]

export function proteinInfo(value) {
  return PROTEINS.find((p) => p.value === value) ?? null
}
