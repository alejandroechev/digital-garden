import test, { describe } from "node:test"
import assert from "node:assert"
import { buildLinkIndex, fromContentRoot, linkKey, resolveWikilinks } from "./scratchpadLinks"

const files = [
  {
    path: "notas/tiempo-profundo.md",
    src: '---\ntitle: "Tiempo profundo"\nslug: tiempo-profundo\naliases: ["Tiempo profundo"]\n---\nTexto',
  },
  {
    // Renamed after its first publish: the slug stays, the title and alias move.
    path: "notas/titulo-viejo.md",
    src: '---\ntitle: "Título nuevo"\nslug: titulo-viejo\naliases: ["Título nuevo"]\n---\nTexto',
  },
  { path: "index.md", src: "---\ntitle: Inicio\n---\nHola" },
]

describe("linkKey", () => {
  test("ignores case, accents and punctuation, like Scratchpad's slugs", () => {
    assert.strictEqual(linkKey("Título  Nuevo!"), linkKey("titulo nuevo"))
    assert.strictEqual(linkKey("Título nuevo"), "titulo-nuevo")
  })
})

describe("resolveWikilinks", () => {
  const index = buildLinkIndex(files)

  test("points a title link at the note's slug, keeping the title as its text", () => {
    assert.strictEqual(
      resolveWikilinks("Ver [[Tiempo profundo]].", index),
      "Ver [[notas/tiempo-profundo|Tiempo profundo]].",
    )
  })

  test("resolves the current title of a renamed note to its frozen slug", () => {
    assert.strictEqual(
      resolveWikilinks("[[Título nuevo]]", index),
      "[[notas/titulo-viejo|Título nuevo]]",
    )
  })

  test("matches regardless of accents and case", () => {
    assert.strictEqual(
      resolveWikilinks("[[titulo NUEVO]]", index),
      "[[notas/titulo-viejo|titulo NUEVO]]",
    )
  })

  test("keeps a custom label and a heading anchor", () => {
    assert.strictEqual(
      resolveWikilinks("[[Tiempo profundo#Uno|esa nota]]", index),
      "[[notas/tiempo-profundo#Uno|esa nota]]",
    )
  })

  test("renders a link to an unpublished note as plain text", () => {
    assert.strictEqual(resolveWikilinks("y [[Nota privada]].", index), "y Nota privada.")
    assert.strictEqual(resolveWikilinks("[[Nota privada|otra]]", index), "otra")
  })

  test("leaves embeds and code untouched", () => {
    assert.strictEqual(resolveWikilinks("![[Nota privada]]", index), "![[Nota privada]]")
    assert.strictEqual(
      resolveWikilinks("`[[Nota privada]]`\n```\n[[Nota privada]]\n```", index),
      "`[[Nota privada]]`\n```\n[[Nota privada]]\n```",
    )
  })

  test("does not touch front matter", () => {
    const src = '---\naliases: ["[[Nota privada]]"]\n---\n[[Nota privada]]'
    assert.strictEqual(
      resolveWikilinks(src, index),
      '---\naliases: ["[[Nota privada]]"]\n---\nNota privada',
    )
  })
})

describe("fromContentRoot", () => {
  test("turns an attachment path relative to the note into one from the content root", () => {
    assert.strictEqual(
      fromContentRoot("notas/sobre-jardines", "./sobre-jardines/a1-foto.jpg"),
      "notas/sobre-jardines/a1-foto.jpg",
    )
    assert.strictEqual(fromContentRoot("notas/x", "../otra/foto.jpg"), "otra/foto.jpg")
  })

  test("keeps anchors and queries", () => {
    assert.strictEqual(fromContentRoot("notas/x", "./x/a.pdf#page=2"), "notas/x/a.pdf#page=2")
  })

  test("leaves anything not explicitly relative alone", () => {
    for (const dest of ["notas/y", "https://example.com/a.jpg", "#titulo", "/abs.jpg"]) {
      assert.strictEqual(fromContentRoot("notas/x", dest), dest)
    }
  })

  test("decodes percent-escapes so Quartz sees the real file name", () => {
    assert.strictEqual(fromContentRoot("index", "./a%20b.jpg"), "a b.jpg")
  })
})
