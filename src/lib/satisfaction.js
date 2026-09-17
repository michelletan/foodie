const FACES = ['😢', '😕', '😐', '🙂', '😄']
const LABELS = ['Very unhappy', 'Unhappy', 'Neutral', 'Happy', 'Very happy']

export function satisfactionFace(rating) {
  return FACES[rating - 1] ?? '—'
}

export function satisfactionLabel(rating) {
  return LABELS[rating - 1] ?? 'Unknown'
}

export const SATISFACTION_RATINGS = [1, 2, 3, 4, 5]
