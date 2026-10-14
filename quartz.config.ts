import { QuartzConfig } from "./quartz/cfg"
import * as Plugin from "./quartz/plugins"

/**
 * fractalpod.com — the public Blog that Scratchpad publishes to.
 *
 * Scratchpad writes notes to content/notas/ (one <slug>.md plus a <slug>/
 * folder of attachments). Everything else here is the site's own.
 */
const config: QuartzConfig = {
  configuration: {
    pageTitle: "Fractalpod",
    pageTitleSuffix: " · Fractalpod",
    enableSPA: true,
    enablePopovers: true,
    analytics: null,
    locale: "es-ES",
    baseUrl: "fractalpod.com",
    ignorePatterns: ["private", "templates", ".obsidian"],
    defaultDateType: "modified",
    theme: {
      fontOrigin: "googleFonts",
      cdnCaching: true,
      typography: {
        header: "Literata",
        body: "Literata",
        code: "IBM Plex Mono",
      },
      colors: {
        lightMode: {
          light: "#faf1dd",
          lightgray: "#e6dcc4",
          gray: "#9a8f78",
          darkgray: "#3d3a33",
          dark: "#1f1d19",
          secondary: "#2f6690",
          tertiary: "#7a9e7e",
          highlight: "rgba(47, 102, 144, 0.10)",
          textHighlight: "#f2d27a88",
        },
        darkMode: {
          light: "#1b1a17",
          lightgray: "#3a3730",
          gray: "#7d7564",
          darkgray: "#ddd5c3",
          dark: "#f3ecdc",
          secondary: "#8bb4d6",
          tertiary: "#9cbf9f",
          highlight: "rgba(139, 180, 214, 0.12)",
          textHighlight: "#b3940288",
        },
      },
    },
  },
  plugins: {
    transformers: [
      Plugin.FrontMatter(),
      Plugin.CreatedModifiedDate({
        priority: ["frontmatter", "git", "filesystem"],
      }),
      Plugin.SyntaxHighlighting({
        theme: {
          light: "github-light",
          dark: "github-dark",
        },
        keepBackground: false,
      }),
      // Must run before Obsidian-flavored Markdown turns [[links]] into anchors.
      Plugin.ScratchpadLinks(),
      Plugin.ObsidianFlavoredMarkdown({ enableInHtmlEmbed: false }),
      Plugin.GitHubFlavoredMarkdown(),
      Plugin.TableOfContents(),
      // After OFM parses raw HTML (<audio>), before CrawlLinks resolves URLs.
      Plugin.ScratchpadAttachments(),
      Plugin.CrawlLinks({ markdownLinkResolution: "shortest" }),
      Plugin.Description(),
      Plugin.Latex({ renderEngine: "katex" }),
    ],
    filters: [Plugin.RemoveDrafts()],
    emitters: [
      Plugin.AliasRedirects(),
      Plugin.ComponentResources(),
      Plugin.ContentPage(),
      Plugin.FolderPage(),
      Plugin.TagPage(),
      Plugin.ContentIndex({
        enableSiteMap: true,
        enableRSS: true,
      }),
      Plugin.Assets(),
      Plugin.Static(),
      Plugin.Favicon(),
      Plugin.NotFoundPage(),
    ],
  },
}

export default config
