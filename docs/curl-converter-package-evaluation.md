# curlconverter Package Evaluation

This document records a research spike for the cURL to Code tool. It compares the `curlconverter`
package with the parser in `shared/utils/dev/curl-converter.ts`. The package is **not** adopted.
A reviewer must approve an adoption first.

## Package facts

A reader collected these values on 2026-09-10. The Sources section gives each URL.

| Field | Value |
| --- | --- |
| Latest version | 4.12.0 |
| Release date | 2025-02-07, about 19 months before this note |
| License | MIT |
| Runtime dependencies | 6: `jsesc`, `lossless-json`, `tree-sitter`, `tree-sitter-bash`, `web-tree-sitter`, `yamljs` |
| Module format | ESM only (`"type": "module"`) |
| Target languages | 29 |
| Install size, unpacked | 3,586,535 bytes in 271 files, for version 4.12.0 |
| Downloads | 76,894 in the week 2026-08-31 to 2026-09-06 |
| Open issues and pull requests | 44, from the GitHub REST API |
| Last push to the repository | 2026-03-10, from `pushed_at` in the GitHub REST API |

## The browser bundle weight is not measured

The install size in the table comes from `dist.unpackedSize` in the registry. It is not a browser
bundle size. The unpacked package is the full published tree. It holds the generator for each of the
29 languages and both `.wasm` files. A bundler drops some of that and keeps the rest.

Two size sources failed. `https://packagephobia.com/result?p=curlconverter` returned HTTP 429, and
`https://data.jsdelivr.com` did not resolve. `github.com` did not resolve either. The registry,
`api.github.com`, and `raw.githubusercontent.com` did resolve, and they gave each value above.

Do not quote a browser bundle size from this document. Measure it before an adoption. Install the
package in a scratch project, and build one browser bundle.

These parts set the weight:

- `web-tree-sitter` loads a WebAssembly parser runtime.
- The browser path needs two more files, `tree-sitter.wasm` and `tree-sitter-bash.wasm`. The README
  says the library requests both files from the root directory of the web server.
- `tree-sitter` and `tree-sitter-bash` are native Node addons. They build at install time. They do
  not run in a browser.
- `yamljs` and `lossless-json` add more code for the HAR and JSON output.

## Integration cost

- The tool page converts the input in a `computed`. The library needs an asynchronous start for the
  WebAssembly parser, and the README asks for top-level await in the bundler. The page must move to
  an asynchronous flow, or to `useToolWorker`.
- The two `.wasm` files need a place in `public/` and a copy step in the build.
- The tool is `clientOnly`. The first conversion then makes two more network requests for the
  `.wasm` files.
- The parser reads Bash syntax with a grammar. This is more power than the tool needs, and it is
  more surface to review.

## Flag coverage

The README of the package says it "Knows about all 255 curl arguments but most are ignored". It
parses many options and then drops most of them with no message.

The local parser applies these options: the positional URL, `--url`, `-X`/`--request`,
`-H`/`--header`, `-d` and its `--data*` group, `--data-urlencode`, `-G`/`--get`, and `-u`/`--user`.
For every other option it returns a notice. The notice table holds 81 option names in 30 groups,
and 7 groups carry a security mark. An option that the table does not hold gets an unknown-option
notice. The page shows the full list under the output.

The comparison is coverage against transparency:

| Point | curlconverter | Local parser |
| --- | --- | --- |
| Options parsed | 255 | 81 named, plus an unknown-option path |
| Report for an option it drops | none | one notice for each option |
| Security mark for `-k`, `--cert`, `--key`, `--proxy` | none | yes |
| Target languages | 29 | 4 |
| Runtime dependencies | 6, plus 2 `.wasm` files | 0 |
| Start | asynchronous | synchronous |

## Recommendation

Do not adopt the package now. Four reasons:

1. DEV-53 needs a message for each option that the code does not apply. The package gives no such
   message, so the tool must keep its own option table anyway.
2. The browser path adds two WebAssembly assets, a copy step, and an asynchronous start for one
   page.
3. The last release is about 19 months old. The repository still gets pushes.
4. The browser bundle size is not measured.

Reconsider the package when the tool must support many more target languages. 29 generators are
real work to write, and that is the one clear advantage of the package. Measure the bundle first,
and keep the notice table for the transparency requirement.

## Sources

- <https://registry.npmjs.org/curlconverter> — latest version, release date, install size, file
  count.
- <https://raw.githubusercontent.com/curlconverter/curlconverter/master/package.json> —
  dependencies, module format.
- <https://raw.githubusercontent.com/curlconverter/curlconverter/master/README.md> — target
  language list, the 255 arguments statement, the `.wasm` requirement, the limitations.
- <https://api.github.com/repos/curlconverter/curlconverter> — license, open issue and pull request
  count, last push date.
- <https://api.npmjs.org/downloads/point/last-week/curlconverter> — download count.
