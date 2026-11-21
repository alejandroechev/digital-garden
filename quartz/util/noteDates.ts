/** Calendar days are shown in the author's time zone, whatever the build host's is. */
export const SITE_TIME_ZONE = "America/Santiago"

const format = new Intl.DateTimeFormat("en-US", {
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
 * "Published March 5, 2026 · updated March 6, 2026", from
 * the `date` (first publish) and `updated` (this version) Scratchpad writes.
 */
export function noteDatesText(frontmatter: Record<string, unknown>): string | null {
  const published = parse(frontmatter.date)
  if (!published) return null
  const updated = parse(frontmatter.updated)
  // Compare instants, not days: a same-day republish is still an update.
  return updated && updated.getTime() !== published.getTime()
    ? `Published ${format.format(published)} · updated ${format.format(updated)}`
    : `Published ${format.format(published)}`
}
