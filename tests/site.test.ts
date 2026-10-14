/**
 * Builds the site from content Scratchpad actually rendered (tests/fixtures/notas,
 * produced by Scratchpad's PublishingService) and checks the pages readers get.
 *
 * Mirrors Scratchpad's acceptance tests AT-14 (faithful page), AT-16 (latest
 * version with an update date) and AT-17 (links and backlinks), offline.
 */
import test, { before, describe } from "node:test"
import assert from "node:assert"
import { execFileSync } from "node:child_process"
import { cpSync, existsSync, mkdtempSync, readFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { fromHtml } from "hast-util-from-html"
import { selectAll, select } from "hast-util-select"
import { toString } from "hast-util-to-string"
import type { Element, Root } from "hast"

const repo = path.resolve(import.meta.dirname, "..")
let out = ""

function page(slug: string): Root {
  return fromHtml(readFileSync(path.join(out, `${slug}.html`), "utf8"))
}

function article(slug: string): Element {
  const node = select("article", page(slug))
  assert.ok(node, `${slug} has an article`)
  return node
}

/** Resolve a URL found on page `slug` to a file in the build output. */
function resolves(slug: string, url: string): boolean {
  const target = path.posix.normalize(path.posix.join(path.posix.dirname(`/${slug}`), url))
  const file = path.join(out, decodeURIComponent(target))
  return existsSync(file) || existsSync(`${file}.html`) || existsSync(path.join(file, "index.html"))
}

before(() => {
  const dir = mkdtempSync(path.join(tmpdir(), "digital-garden-"))
  const content = path.join(dir, "content")
  cpSync(path.join(repo, "content", "index.md"), path.join(content, "index.md"))
  cpSync(path.join(repo, "tests", "fixtures", "notas"), path.join(content, "notas"), {
    recursive: true,
  })
  out = path.join(dir, "public")
  execFileSync(
    process.execPath,
    [path.join(repo, "quartz", "bootstrap-cli.mjs"), "build", "-d", content, "-o", out],
    { cwd: repo, stdio: "pipe" },
  )
})

describe("a published note (AT-14)", () => {
  test("shows the title, paragraph and checklist", () => {
    const html = page("notas/sobre-jardines")
    assert.strictEqual(toString(select("h1.article-title", html)!), "Sobre jardines")
    const body = article("notas/sobre-jardines")
    assert.match(toString(body), /Un jardín de notas crece despacio/)
    const boxes = selectAll("input[type=checkbox]", body)
    assert.strictEqual(boxes.length, 2)
    assert.strictEqual(boxes.filter((b) => b.properties.checked).length, 1)
  })

  test("shows both photos together as a gallery", () => {
    const images = selectAll("p > img", article("notas/sobre-jardines"))
    assert.strictEqual(images.length, 2)
    const css = readFileSync(path.join(out, "index.css"), "utf8")
    assert.match(css, /p:has\(>\s*img\s*\+\s*img\)/)
  })

  test("every photo, voice note and file it references is served", () => {
    const body = article("notas/sobre-jardines")
    const urls = [
      ...selectAll("img, audio, video", body).map((n) => String(n.properties.src)),
      ...selectAll("a.internal", body).map((n) => String(n.properties.href)),
    ]
    assert.ok(selectAll("audio[controls]", body).length === 1, "a playable audio player")
    assert.ok(
      urls.some((u) => u.endsWith(".pdf")),
      "a link to the PDF",
    )
    for (const url of urls) {
      assert.ok(resolves("notas/sobre-jardines", url), `${url} resolves to a built file`)
    }
  })

  test("plays a video inline, served from the site", () => {
    const videos = selectAll("video", article("notas/sobre-jardines"))
    assert.strictEqual(videos.length, 1)
    const video = videos[0]
    assert.ok("controls" in video.properties, "with native controls")
    assert.ok("playsInline" in video.properties, "inline on phones, not forced fullscreen")
    assert.ok(resolves("notas/sobre-jardines", String(video.properties.src)), "the video file is served")
    assert.ok(
      !selectAll("a", article("notas/sobre-jardines")).some((a) => /\.mp4$/.test(String(a.properties.href))),
      "not offered as a download link",
    )
  })

  test("downloads skip Quartz's page router", () => {
    const pdf = selectAll("a", article("notas/sobre-jardines")).find((a) =>
      String(a.properties.href).endsWith(".pdf"),
    )
    assert.ok(pdf)
    assert.ok("dataRouterIgnore" in pdf.properties, "the PDF link opts out of SPA navigation")
  })
})

describe("a republished note (AT-16)", () => {
  test("shows only the latest text and says when it was updated", () => {
    const text = toString(page("notas/sobre-jardines"))
    assert.match(text, /MARCADOR-B/)
    assert.doesNotMatch(text, /MARCADOR-A/)
    assert.match(text, /actualizado el/)
  })

  test("a note published once has no update line", () => {
    const text = toString(page("notas/tiempo-profundo"))
    assert.match(text, /Publicado el/)
    assert.doesNotMatch(text, /actualizado el/)
  })
})

describe("links between notes (AT-17)", () => {
  const links = () =>
    selectAll("a.internal", article("notas/sobre-jardines")).map((a) => ({
      text: toString(a),
      href: String(a.properties.href),
    }))

  test("a [[title]] link reaches the published note", () => {
    const link = links().find((l) => l.text === "Tiempo profundo")
    assert.ok(link, "an anchor for Tiempo profundo")
    assert.ok(resolves("notas/sobre-jardines", link.href), `${link.href} resolves`)
    assert.match(link.href, /notas\/tiempo-profundo$/)
  })

  test("a link to a renamed note's new title reaches its original URL", () => {
    const link = links().find((l) => l.text === "Título nuevo")
    assert.ok(link)
    assert.match(link.href, /notas\/titulo-viejo$/)
  })

  test("the linked note lists the linking note as a backlink", () => {
    const backlinks = select(".backlinks", page("notas/tiempo-profundo"))
    assert.ok(backlinks)
    assert.match(toString(backlinks), /Sobre jardines/)
  })

  test("a link to an unpublished note is plain text", () => {
    const body = article("notas/sobre-jardines")
    assert.match(toString(body), /Nota privada/)
    for (const a of selectAll("a", body)) assert.doesNotMatch(toString(a), /Nota privada/)
  })
})

describe("the home page", () => {
  test("lists the published notes", () => {
    const text = toString(page("index"))
    for (const title of ["Sobre jardines", "Tiempo profundo", "Título nuevo"]) {
      assert.match(text, new RegExp(title))
    }
  })
})
