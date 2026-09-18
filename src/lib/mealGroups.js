export function capitalize(s) {
  return s ? s[0].toUpperCase() + s.slice(1) : s
}

export function formatDate(dateStr) {
  const d = new Date(dateStr)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yy = String(d.getFullYear()).slice(-2)
  return `${dd}/${mm}/${yy}`
}

export function formatTime(dateStr) {
  const d = new Date(dateStr)
  let h = d.getHours()
  const m = String(d.getMinutes()).padStart(2, '0')
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${String(h).padStart(2, '0')}:${m} ${ampm}`
}

// ServeForm.jsx saves one meal that spans multiple freezer batches as
// several serving_event rows (one per batch, no shared "meal" id in the
// schema) — see its handleSubmit for why. Re-group them here for display:
// rows sharing who/what/how-it-went, saved within a few seconds of each
// other, are almost certainly one "Save" click, not a coincidence — a real
// second meal logged that close together with identical rating/notes is
// vanishingly unlikely for how this app gets used.
export const GROUP_WINDOW_MS = 10_000

export function groupRows(rows) {
  const groups = []
  for (const row of rows) {
    const last = groups[groups.length - 1]
    const sameMeal =
      last &&
      last.servedByName === row.servedByName &&
      last.mealType === row.event.meal_type &&
      last.rating === row.event.satisfaction_rating &&
      last.notes === (row.event.notes ?? null) &&
      Math.abs(new Date(last.lastServedAt) - new Date(row.event.served_at)) <= GROUP_WINDOW_MS
    if (sameMeal) {
      last.items.push(row)
      last.lastServedAt = row.event.served_at
      if (!last.photoUrl && row.photoUrl) last.photoUrl = row.photoUrl
    } else {
      groups.push({
        id: row.event.id,
        servedByName: row.servedByName,
        mealType: row.event.meal_type,
        rating: row.event.satisfaction_rating,
        notes: row.event.notes ?? null,
        servedAt: row.event.served_at,
        lastServedAt: row.event.served_at,
        photoUrl: row.photoUrl,
        items: [row],
      })
    }
  }
  return groups
}
