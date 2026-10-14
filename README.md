# fractalpod.com — Blog

The public Blog that [ScratchPad](https://github.com/alejandroechev/scratchpad)
publishes notes to. Built with [Quartz](https://quartz.jzhao.xyz) v4.5.2 (MIT,
see `LICENSE.txt`) and hosted on Cloudflare Pages.

## Who writes what

| Path             | Owner                                                                                                                |
| ---------------- | -------------------------------------------------------------------------------------------------------------------- |
| `content/notas/` | **ScratchPad.** Every publish is one commit here. Don't edit by hand; changes are overwritten on the next republish. |
| everything else  | This site: `content/index.md`, layout, styles, plugins.                                                              |

ScratchPad writes one note as:

```
content/notas/<slug>.md                    front matter + Markdown body
content/notas/<slug>/<blob>-<name>.<ext>   its photos, voice notes and files
```

Front matter: `title`, `slug` (frozen at first publish, so URLs never change),
`version`, `date` (first publish), `updated` (this version) and `aliases`
(the current title).

## What the site adds to Quartz

- **`[[Título]]` links** — `quartz/plugins/transformers/scratchpadLinks.ts`
  resolves a link by title, alias or slug (ignoring accents and case), so a
  link to a renamed note still reaches its original URL. A link to a note that
  isn't published here renders as plain text.
- **Attachments** — the same file rewrites ScratchPad's note-relative
  `./<slug>/<file>` URLs so Quartz serves them, and sends downloads past the
  SPA router.
- **"Publicado el … · actualizado el …"** — `quartz/components/NoteDates.tsx`,
  in Chile's time zone.
- **Photo gallery** — consecutive photos form a grid (`quartz/styles/custom.scss`).
- **Video** — ScratchPad writes `<video controls playsinline>`, already stripped of
  its location; it plays inline at full width. Files over 25 MB never get here:
  ScratchPad refuses them, because Cloudflare Pages rejects them.

## Develop

```sh
npm ci
npm run serve        # http://localhost:8080
npm test             # unit tests + a full build of tests/fixtures/notas
npm run check        # tsc + prettier
```

`tests/fixtures/notas/` is real ScratchPad output (v0.23.0 renderer): a note
with wiki links, a checklist, two photos, a voice note, a video and a PDF; a renamed
note; and a republished one. `tests/site.test.ts` builds it and checks the
pages readers get.

## Deploy

Cloudflare Pages, production branch `main`:

- Build command: `npx quartz build`
- Output directory: `public`
- Node version comes from `.node-version`.
