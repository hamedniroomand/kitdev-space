# Security Baseline

This checklist records security controls for KitDev Space.

## Rules

1. Do not use `eval` for tool input.
2. Network tools must validate the URL before a remote fetch.
3. Allow only `http` and `https` for remote fetch.
4. Block localhost, private IPs, shared address space, link-local addresses,
   multicast, reserved ranges, and cloud metadata hosts. Block the IPv6
   transition ranges (NAT64, 6to4, and Teredo), because they carry an IPv4
   address inside an IPv6 address.
5. Apply a timeout on remote fetch.
6. Limit redirects and response body size for remote fetch. Check
   `content-length` first, then read the body through a stream and stop at the
   cap. Do not buffer the full response before the size check.
7. Restrict the destination port. Remote fetch tools use `WEB_PORTS`. The TLS
   Inspector uses `TLS_PORTS`, so it cannot scan arbitrary ports.
8. Rate-limit every API route. Derive the rate-limit key with `getClientKey`.
   Do not read `x-forwarded-for` directly: a client can set it, and the leftmost
   value defeats every limit.
9. Do not store tool input or output.
10. Analytics events may include the tool id only. Do not include input or output.
10a. Google Analytics must not receive tool input or output. Ads consent stays
   denied by default.
11. Image and archive uploads must stay in memory. Do not write user files to disk.
12. Pass user image bytes into `Bun.Image`. Do not pass user-controlled
   filesystem paths.
12a. SVG uploads are scanned for remote resources, rasterized with
   `@resvg/resvg-js` (`loadSystemFonts: false`), then PNG bytes go into
   `Bun.Image`. Do not pass user-controlled filesystem paths to resvg font
   options.
12b. The module resolver accepts a relative directory below the application
   root only. It reports paths relative to that root, because an absolute path
   discloses the server layout.
13. Reject image and archive bodies larger than 25 MB.
14. Cap the input length of every text tool that runs a parser or a formatter.
15. Password Benchmarker must cap hash cost params and use a stricter rate limit.
16. Do not log password request bodies.
17. OpenGraph preview must use the same SSRF controls as other network fetch tools.
18. Cap OpenGraph HTML responses (1 MB).
19. Markdown preview must escape HTML in the input and drop link and image
   targets that carry an executable scheme. The preview renders with `v-html`.
20. Send security response headers on every route. API routes send a
   `default-src 'none'; sandbox` policy and `no-store`.
21. Pin the Vercel function runtime. See "Runtime" below.

## Current controls

| Control | Location |
|---------|----------|
| SSRF checks and port allowlists | `server/utils/network/ssrf.ts` |
| Rate-limit key | `server/utils/network/client-ip.ts` |
| Rate limit (bounded) | `server/utils/network/rate-limit.ts` |
| Safe fetch | `server/utils/network/http.ts` |
| Security response headers and CSP | `nuxt.config.ts` (`routeRules`) |
| Analytics stub | `app/composables/useToolAnalytics.ts` |
| Google Analytics (tool id only) | `app/composables/useToolAnalytics.ts`, `app/plugins/google-analytics.client.ts` |
| Image size limit | `server/utils/image/limits.ts` |
| Image SVG rasterize | `server/utils/image/svg.ts` |
| Image upload reader | `server/utils/image/read-upload.ts` |
| Image APIs | `server/api/image/*.post.ts` |
| Password cost ceilings | `server/utils/crypto/password.ts` |
| Password API (5 req / 60s) | `server/api/crypto/password-benchmark.post.ts` |
| HTML fetch (SSRF + streamed size cap) | `server/utils/network/fetch-html.ts` |
| OpenGraph extractor | `server/utils/network/og.ts` |
| OpenGraph API | `server/api/network/og-preview.post.ts` |
| Resolver directory confinement | `server/utils/dev/ast.ts` |
| Markdown escape and URL filter | `shared/utils/data/markdown.ts` |
| RDAP query validation | `server/utils/network/rdap.ts` |

## Runtime

Every API route needs Bun globals (`Bun.*` and `HTMLRewriter`). Nitro picks the
Vercel function runtime from `"Bun" in globalThis` at build time. `nuxt build`
runs under Node, so the default result is `nodejs22.x`, and on that runtime the
APIs fail with "Bun is not defined".

`nitro.vercel.functions.runtime` in `nuxt.config.ts` pins the runtime to
`bun1.x`. Do not remove it. To confirm after a build:

```bash
NITRO_PRESET=vercel bun run build
cat .vercel/output/functions/__fallback.func/.vc-config.json
```

The `runtime` field must read `bun1.x`.

The Bun runtime for Vercel Functions is a public beta. Watch the Vercel
changelog for a status change.

## Residual risk

1. DNS rebinding can change a host address after the SSRF check and before the
   fetch. A later phase can add a reconnect check.
2. Rate-limit counts stay in the memory of one function instance. Vercel runs
   many instances, so the true limit is the configured limit for each instance.
   Shared storage or the Vercel firewall can make the limit global.
3. The Content Security Policy needs `'unsafe-inline'` for scripts. Every page
   is prerendered to static HTML, so a per-request nonce is not possible.
