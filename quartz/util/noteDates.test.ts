import test, { describe } from "node:test"
import assert from "node:assert"
import { noteDatesText } from "./noteDates"

describe("noteDatesText", () => {
  test("shows the first-publish date and when it was updated", () => {
    assert.strictEqual(
      noteDatesText({ date: "2026-03-05T12:00:00.000Z", updated: "2026-03-06T12:00:00.000Z" }),
      "Publicado el 5 de marzo de 2026 · actualizado el 6 de marzo de 2026",
    )
  })

  test("omits the update on a note that was never republished", () => {
    assert.strictEqual(
      noteDatesText({ date: "2026-03-05T12:00:00.000Z", updated: "2026-03-05T12:00:00.000Z" }),
      "Publicado el 5 de marzo de 2026",
    )
  })

  test("still says it was updated after a same-day republish", () => {
    assert.strictEqual(
      noteDatesText({ date: "2026-03-05T12:00:00.000Z", updated: "2026-03-05T15:00:00.000Z" }),
      "Publicado el 5 de marzo de 2026 · actualizado el 5 de marzo de 2026",
    )
  })

  test("uses Chile's calendar day, not UTC's", () => {
    // 02:00 UTC on the 6th is still the evening of the 5th in Santiago.
    assert.strictEqual(
      noteDatesText({ date: "2026-03-06T02:00:00.000Z" }),
      "Publicado el 5 de marzo de 2026",
    )
  })

  test("returns nothing for a page without Scratchpad dates", () => {
    assert.strictEqual(noteDatesText({}), null)
    assert.strictEqual(noteDatesText({ date: "no es fecha" }), null)
  })
})
