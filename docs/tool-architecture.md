# Tool architecture

Rules for a new tool or a change to a tool in the hub.

## Where the work runs

Run the work in the browser. Use a server route only when the work cannot run in the browser.

A server route is correct when one of these is true:

- The work needs a native library that the browser does not have. AVIF encode and SVG rasterization
  need `Bun.Image`. A TLS handshake needs a socket.
- The work needs a Bun-only API with no browser equal, such as `Bun.dns` or `Bun.Archive`.
- The work needs a network request to another host. The browser cannot make that request, because
  of CORS. DNS, HTTP headers, RDAP, and OpenGraph are in this group.
- The input is too large for the browser to hold.

A server route is not correct when a platform API covers the work:

| Work                          | Browser API                        |
| ----------------------------- | ---------------------------------- |
| SHA-1, SHA-256, SHA-384, SHA-512 | `crypto.subtle.digest`          |
| Random bytes                  | `crypto.getRandomValues`           |
| Resize, rotate, grayscale     | `OffscreenCanvas`, `createImageBitmap` |
| JPEG, PNG, and WebP encode    | `OffscreenCanvas.convertToBlob`    |
| Gzip and deflate              | `fflate`, an installed dependency  |
| Read image metadata           | `DataView` over the file bytes     |
| YAML parse and write          | `yaml`, an installed dependency    |
| CSS minify                    | `csso`, an installed dependency    |
| JSON format and minify        | `shared/utils/data/json.ts`        |

Web Crypto has no MD5, no CRC32, and no xxHash. A tool that offers those keeps a server path for
them.

A tool with a browser path and a server path keeps one source. Put the browser code in
`shared/utils/`, export a `can*InBrowser()` guard next to it, and let the server route import the
same module. `shared/utils/crypto/hash.ts`, `shared/utils/data/convert.ts`,
`shared/utils/dev/code-format.ts`, and `shared/utils/dev/semver.ts` show the pattern.

## Why this rule exists

Each server call costs a round trip, needs a rate limit, and weakens the privacy claim. A user who
pastes a `.env` file or uploads a private photo must get the browser path. A tool that reads a
private file and sends it to a server cannot claim privacy, even when the server keeps nothing.

## The sidebar badge

The badge follows the registry flags in `shared/utils/tools.ts`:

- `clientOnly: true` shows "🔒 Client". Use it when no tool action calls the server.
- `serverRequired: true` shows "⚡ Bun". Use it when every tool action calls the server.
- Both `false` shows no badge. Use it for a tool with a browser path and a server path. State the
  split on the page, so the user knows which action leaves the browser.

## The registry is the one source

`shared/utils/tools.ts` gives the name and the description of a tool. The same text feeds:

- the `h1` of the page, through `ToolPage` and `ToolHeader`,
- the title tag and the meta description, through `useToolSeo`,
- the OpenGraph image,
- the sidebar row and the search index.

`seoTitle` is optional. When a name has a symbol or misses the query noun, such as "JSON ↔ YAML",
give a `seoTitle` such as "JSON to YAML Converter". The title tag, the `h1`, the OpenGraph image,
and the schema name use `seoTitle` when it exists. The sidebar, the command palette, and the
breadcrumbs keep the short `name`. Keep a `seoTitle` under 45 characters, so the full title tag
with the site name stays under 60.

Do not repeat the name or the description in the page. Do not call `useSeoMeta` in a tool page.
Give `title` or `description` to `ToolPage` only to override the registry.

## Analytics

Do not call `useToolAnalytics` in a page. The shared composables send every event:

| Event           | Sent by            |
| --------------- | ------------------ |
| `tool_open`     | `useToolSeo`       |
| `tool_execute`  | `useTool`          |
| `tool_error`    | `useTool`          |
| `tool_copy`     | `useCopyFeedback`  |
| `tool_download` | `useDownload`      |

An event carries the tool id only. Never send the input or the output of a user.

## Page structure

A tool page uses `ToolPage`. It gives the frame, the heading, and the related tools.

- Show an error with `ToolError`. Do not use `alert()`.
- Use the theme colors. Do not use raw `red-*`, `gray-*`, or other palette classes.
- Fill the `docs` slot. A page with no prose gives a search engine nothing to rank.
- Do not replace the input of a user when a control changes. Use `useSampleInput`.

## Merged tools

When two tools do one job, merge them and keep each old route as a redirect in
`shared/utils/redirects.ts`. A name such as "exif stripper" or "image resizer" carries search
traffic, so the route must continue to work. The prefix fallback covers `/<category>/*` only, so a
move between labs needs an explicit `/hub/<old>` entry.

## Variant routes

A merged tool can hold more than one search intent. "uuid generator" and "passphrase generator"
are two intents, and one page has one title. Give such an intent a variant entry in the registry:

- Set `variantOf` to the id of the parent tool.
- Give the variant its own route, name, description, and keywords. The name carries the query
  words, such as "Base64 Encoder & Decoder".
- Do not write new tool logic. The parent tool lives in a component with a `toolId` prop and
  preset props, such as `EncoderTool`. The variant page renders that component with the preset
  and fills the `docs` slot with prose that is specific to the intent.
- Remove the old redirect for the route, so the URL serves the page.

The sidebar, the category pages, and the tool count use `getToolsByCategory` and
`getPrimaryTools`, which skip variants. The command palette, the search, the sitemap, and
`llms.txt` list variants, because a user or a crawler can look for them by name.
