const FACES = ['😢', '😕', '😐', '🙂', '😄']
const LABELS = ['Very unhappy', 'Unhappy', 'Neutral', 'Happy', 'Very happy']

export function satisfactionFace(rating) {
  if (rating == null) return '—'
  return FACES[rating - 1] ?? '—'
}

export function satisfactionLabel(rating) {
  if (rating == null) return 'No rating'
  return LABELS[rating - 1] ?? 'Unknown'
}

export const SATISFACTION_RATINGS = [1, 2, 3, 4, 5]
