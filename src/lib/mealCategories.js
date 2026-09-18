// Shared between RecipeForm/RecipeList/RecipeDetail/AnalysisView/
// LowStockCallout. Values must match the check constraint on
// recipes.category (0001_schema.sql).
//
// countsTowardStock marks whether a recipe in this category should count
// toward the freezer's total-portions low-stock alert — soups and carbs are
// sides/bases rather than a main, so running low on them isn't the same
// "time to cook" signal running low on protein mains is.
export const MEAL_CATEGORIES = [
  { value: 'beef', label: 'Beef', icon: '🥩', countsTowardStock: true },
  { value: 'chicken', label: 'Chicken', icon: '🍗', countsTowardStock: true },
  { value: 'pork', label: 'Pork', icon: '🐷', countsTowardStock: true },
  { value: 'fish', label: 'Fish', icon: '🐟', countsTowardStock: true },
  { value: 'egg', label: 'Egg', icon: '🥚', countsTowardStock: true },
  { value: 'vegetarian', label: 'Vegetarian', icon: '🥦', countsTowardStock: true },
  { value: 'soup', label: 'Soup', icon: '🍲', countsTowardStock: false },
  { value: 'carbs', label: 'Carbs', icon: '🍚', countsTowardStock: false },
  { value: 'other', label: 'Other', icon: '🍽️', countsTowardStock: true },
]

export function categoryInfo(value) {
  return MEAL_CATEGORIES.find((c) => c.value === value) ?? null
}
