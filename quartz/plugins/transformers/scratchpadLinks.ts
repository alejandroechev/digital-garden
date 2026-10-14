import fs from "fs"
import path from "path"
import matter from "gray-matter"
import { visit } from "unist-util-visit"
import { Root } from "hast"
import { QuartzTransformerPlugin } from "../types"
import { BuildCtx } from "../../util/ctx"

/**
 * Resolves `[[Título]]` links the way Scratchpad writes them.
 *
 * Scratchpad names each file after a slug frozen at first publish, and keeps the
 * note's current title in `title` and `aliases`. Quartz resolves wikilinks by
 * file name, so `[[Tiempo profundo]]` would miss `tiempo-profundo.md`, and a
 * link to an unpublished note would render as a link to a missing page.
 *
 * This runs before Obsidian-flavored Markdown and rewrites each link:
 *   - a published title (or slug) → `[[<path>|<text>]]`, which Quartz then
 *     resolves and counts for backlinks;
 *   - anything else → its plain text, so nothing private is hinted at by a
 *     broken link.
 *
 * Its companion ScratchpadAttachments rewrites the note-relative attachment
 * URLs Scratchpad writes (`./<slug>/<file>`) to paths from the content root,
 * because Quartz's `shortest` link strategy resolves every internal URL from
 * the root.
 */

export interface SourceFile {
  /** Path relative to the content folder, e.g. `notas/tiempo-profundo.md`. */
  path: string
  src: string
}

export type LinkIndex = Map<string, string>

/** Case-, accent- and punctuation-insensitive key; mirrors Scratchpad's slugify. */
export function linkKey(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function buildLinkIndex(files: SourceFile[]): LinkIndex {
  const index: LinkIndex = new Map()
  for (const file of files) {
    const target = file.path.replace(/\\/g, "/").replace(/\.md$/, "")
    let data: Record<string, unknown> = {}
    try {
      data = matter(file.src).data
    } catch {
      // A file with broken front matter can still be linked by its name.
    }
    const aliases = Array.isArray(data.aliases) ? data.aliases : []
    const names = [path.posix.basename(target), data.slug, data.title, ...aliases]
    for (const name of names) {
      if (typeof name !== "string") continue
      const key = linkKey(name)
      if (key && !index.has(key)) index.set(key, target)
    }
  }
  return index
}

const FENCE = /^(```|~~~)/
const INLINE_CODE = /(`+)[\s\S]*?\1/g
const WIKILINK = /(!?)\[\[([^\[\]\|#\n]*)(#[^\[\]\|\n]*)?(?:\|([^\[\]\n]*))?\]\]/g

export function resolveWikilinks(src: string, index: LinkIndex): string {
  const { frontMatter, body } = splitFrontMatter(src)
  let inFence = false
  const lines = body.split("\n").map((line) => {
    if (FENCE.test(line.trim())) {
      inFence = !inFence
      return line
    }
    return inFence ? line : resolveLine(line, index)
  })
  return frontMatter + lines.join("\n")
}

function resolveLine(line: string, index: LinkIndex): string {
  // Rewrite only outside inline code spans.
  let out = ""
  let last = 0
  for (const code of line.matchAll(INLINE_CODE)) {
    out += resolveText(line.slice(last, code.index), index) + code[0]
    last = code.index! + code[0].length
  }
  return out + resolveText(line.slice(last), index)
}

function resolveText(text: string, index: LinkIndex): string {
  return text.replace(
    WIKILINK,
    (whole, embed: string, target: string, anchor = "", label?: string) => {
      if (embed) return whole
      const shown = (label ?? target).trim()
      const resolved = index.get(linkKey(target))
      return resolved ? `[[${resolved}${anchor}|${shown}]]` : shown
    },
  )
}

function splitFrontMatter(src: string): { frontMatter: string; body: string } {
  const match = /^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/.exec(src)
  return match
    ? { frontMatter: match[0], body: src.slice(match[0].length) }
    : { frontMatter: "", body: src }
}

/** `./sobre-jardines/a.jpg` on `notas/sobre-jardines` → `notas/sobre-jardines/a.jpg`. */
export function fromContentRoot(slug: string, dest: string): string {
  if (!dest.startsWith("./") && !dest.startsWith("../")) return dest
  const base = new URL(`https://site.invalid/${slug}`)
  const url = new URL(dest, base)
  return decodeURIComponent(url.pathname.replace(/^\//, "")) + url.search + url.hash
}

const URL_ATTRIBUTES: Record<string, string> = {
  a: "href",
  img: "src",
  audio: "src",
  video: "src",
  source: "src",
  iframe: "src",
}

function isFile(url: string): boolean {
  const ext = path.posix.extname(url.split(/[?#]/)[0]).toLowerCase()
  return ext !== "" && ext !== ".md" && ext !== ".html"
}

function readContent(dir: string): SourceFile[] {
  const files: SourceFile[] = []
  const walk = (rel: string) => {
    for (const entry of fs.readdirSync(path.join(dir, rel), { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue
      const child = path.posix.join(rel, entry.name)
      if (entry.isDirectory()) walk(child)
      else if (entry.name.endsWith(".md")) {
        files.push({ path: child, src: fs.readFileSync(path.join(dir, child), "utf8") })
      }
    }
  }
  walk("")
  return files
}

export const ScratchpadLinks: QuartzTransformerPlugin = () => {
  const indexes = new WeakMap<BuildCtx, LinkIndex>()
  return {
    name: "ScratchpadLinks",
    textTransform(ctx, src) {
      let index = indexes.get(ctx)
      if (!index) {
        index = buildLinkIndex(readContent(ctx.argv.directory))
        indexes.set(ctx, index)
      }
      return resolveWikilinks(src.toString(), index)
    },
  }
}

/**
 * Runs after Obsidian-flavored Markdown has parsed raw HTML (Scratchpad writes
 * voice notes as `<audio>`), and before CrawlLinks.
 */
export const ScratchpadAttachments: QuartzTransformerPlugin = () => ({
  name: "ScratchpadAttachments",
  htmlPlugins() {
    return [
      () => (tree: Root, file) => {
        const slug = file.data.slug
        if (!slug) return
        visit(tree, "element", (node) => {
          const attribute = URL_ATTRIBUTES[node.tagName]
          const value = attribute ? node.properties?.[attribute] : undefined
          if (typeof value !== "string") return
          const rewritten = fromContentRoot(slug, value)
          node.properties[attribute] = rewritten
          // A download is not a page: let the browser open it instead of the SPA router.
          if (node.tagName === "a" && rewritten !== value && isFile(rewritten)) {
            node.properties.dataRouterIgnore = true
          }
        })
      },
    ]
  },
})
