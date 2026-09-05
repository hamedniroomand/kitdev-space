# Security Baseline

This checklist records security controls for KitDev Space.

## Rules

1. Do not use `eval` for tool input.
2. Network tools must validate the URL before a remote fetch.
3. Allow only `http` and `https` for remote fetch.
4. Block localhost, private IPs, link-local addresses, and cloud metadata hosts.
5. Apply a timeout on remote fetch.
6. Limit redirects and response body size for remote fetch.
7. Rate-limit network and image APIs.
8. Do not store tool input or output.
9. Analytics events may include the tool id only. Do not include input or output.
10. Image and archive uploads must stay in memory. Do not write user files to disk.
11. Pass user image bytes into `Bun.Image`. Do not pass user-controlled filesystem paths.
12. Reject image and archive bodies larger than 25 MB.

## Current controls

| Control | Location |
|---------|----------|
| SSRF checks | `server/utils/network/ssrf.ts` |
| Rate limit | `server/utils/network/rate-limit.ts` |
| Safe fetch | `server/utils/network/http.ts` |
| Analytics stub | `app/composables/useToolAnalytics.ts` |
| Image size limit | `server/utils/image/limits.ts` |
| Image upload reader | `server/utils/image/read-upload.ts` |
| Image APIs | `server/api/image/*.post.ts` |

## Residual risk

DNS rebinding can change a host address after the SSRF check and before fetch. A later phase can add a reconnect check.
