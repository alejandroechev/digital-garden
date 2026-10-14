/** Calendar days are shown in the author's time zone, whatever the build host's is. */
export const SITE_TIME_ZONE = "America/Santiago"

const format = new Intl.DateTimeFormat("es-CL", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: SITE_TIME_ZONE,
})

function parse(value: unknown): Date | null {
  if (typeof value !== "string" && !(value instanceof Date)) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * "Publicado el 5 de marzo de 2026 · actualizado el 6 de marzo de 2026", from
 * the `date` (first publish) and `updated` (this version) Scratchpad writes.
 */
export function noteDatesText(frontmatter: Record<string, unknown>): string | null {
  const published = parse(frontmatter.date)
  if (!published) return null
  const updated = parse(frontmatter.updated)
  // Compare instants, not days: a same-day republish is still an update.
  return updated && updated.getTime() !== published.getTime()
    ? `Publicado el ${format.format(published)} · actualizado el ${format.format(updated)}`
    : `Publicado el ${format.format(published)}`
}
