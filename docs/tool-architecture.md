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
| MD5, CRC32, xxHash64          | `hash-wasm`, an installed dependency |
| A hash of a file of up to 2 GB | `hash-wasm`, over `Blob.stream()` |
| Random bytes                  | `crypto.getRandomValues`           |
| Resize, rotate, grayscale     | `OffscreenCanvas`, `createImageBitmap` |
| JPEG, PNG, and WebP encode    | `OffscreenCanvas.convertToBlob`    |
| Gzip and deflate              | `fflate`, an installed dependency  |
| Read image metadata           | `DataView` over the file bytes     |
| YAML, TOML, and JSON5         | `confbox`, an installed dependency |
| YAML with error positions     | `yaml`, an installed dependency    |
| CSS minify                    | `csso`, an installed dependency    |
| JSON format and minify        | `shared/utils/data/json.ts`        |

Web Crypto has no MD5, no CRC32, and no xxHash, and `crypto.subtle.digest` needs the full input in
memory. `hash-wasm` covers both gaps in the browser: it adds those algorithms, and it gives an
incremental hasher for every algorithm. A tool that hashes a large file streams the file through
that hasher, so it needs no server path. `shared/utils/crypto/hash.ts` shows the pattern: Web
Crypto for SHA over text, `hash-wasm` for the other algorithms and for every file.

Bun has `Bun.hash.wyhash`, which no browser and no WebAssembly module gives. A tool does not offer
wyhash, because the hash tool runs fully in the browser.

`confbox` reads and writes YAML, TOML, JSONC, and JSON5. It has no dependency of its own and it
tree-shakes, so the formats together cost about the bundle bytes of a YAML-only library. Use it for
a converter. Use `yaml` only when a tool must show the line and the column of each error, because
`confbox` stops at the first one. XML converts in the browser with `DOMParser` and `XMLSerializer`.

A tool with a browser path and a server path keeps one source. Put the browser code in
`shared/utils/`, export a `can*InBrowser()` guard next to it, and let the server route import the
same module. `shared/utils/data/convert.ts`, `shared/utils/dev/code-format.ts`, and
`shared/utils/dev/semver.ts` show the pattern.

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

Do not call `useToolAnalytics` in a page for the standard events. The shared composables send them:

| Event | Sent by | Parameters |
| --- | --- | --- |
| `tool_open` | `useToolSeo` | defaults only |
| `tool_select` | sidebar, palette, hub cards, category pages, `RelatedTools`, home | `source` |
| `tool_execute` | `useTool.run`, `useLiveTool` | `duration_ms`, `input_bytes_bucket`, `run_location` for a mixed tool, `option` |
| `tool_error` | `useTool.run`, `useLiveTool`, `useCopyFeedback` | `error_kind` |
| `tool_copy` | `useCopyFeedback` | `target` |
| `tool_download` | `useDownload` | `file_format` |
| `tool_search` | palette open | defaults only |
| `search_result` | palette pick | `query_length` |
| `tool_input` | `ToolEditor`, `ImageDropzone`, `useSampleInput`, URL tools | `method`, once per method per page |
| `cta_click` | footer and hub GitHub links, landing links | `cta`, no tool |

Every tool event carries `tool_id`, `tool_category`, `run_location`, and `tool_variant_of` when the
tool is a variant. The values come from the registry.

Tools that calculate output live in computed values use `useLiveTool`. It watches the computation with `watchDebounced` at a 400 ms interval. It sends `tool_execute` once after user input settles. It sends `tool_error` when the calculation throws an error. It does not send events on raw keystrokes.

Every parameter value comes from a fixed list in code or is a size bucket. An event never carries
the input, the output, a file name, a URL, a search query, or an error message. `error_kind` comes
from the error shape, such as the HTTP status or the error name. `option` is the enumerated choice
of a tool, such as the hash algorithm; pass it to `useTool.run` in its third argument, together with
`runLocation` for a tool that has a browser path and a server path.

`useToolInput` records the size of each input control and the method the user used, so
`useTool.run` can send a size bucket without a caller passing the input. A tool that reads a URL
from a plain input calls `reportInput('url')` in its run handler.

The event names live in the `ToolAnalyticsEvent` union in `useToolAnalytics.ts`, and the
parameters of each event in `ToolAnalyticsParams`. Add an event in both places.

GA4 needs each parameter registered once as a custom dimension or metric. Event-scoped dimensions:
`tool_id`, `tool_category`, `run_location`, `tool_variant_of`, `error_kind`, `source`, `method`,
`file_format`, `option`, `input_bytes_bucket`, `query_length`, `target`, `cta`. Event-scoped metric:
`duration_ms`. User-scoped dimension: `color_mode`.

Internal traffic: open `/?internal=1` once in a browser to mark it. Every event from that browser
then carries `traffic_type: internal`, which the GA4 internal traffic filter drops. `/?internal=0`
clears the mark.

## Page structure

A tool page uses `ToolPage`. It gives the frame, the heading, and the related tools.

- Render an editor as `<LazyToolEditor hydrate-on-idle>`. The CodeMirror chunk then loads after
  the main thread is free, and the prerendered HTML stays visible in the meantime.
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
