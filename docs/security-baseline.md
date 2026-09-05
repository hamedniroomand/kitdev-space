# Security Baseline (Phase 1)

This checklist records Phase 1 security controls for DevKit Space.

## Rules

1. Do not use `eval` for tool input.
2. Network tools must validate the URL before a remote fetch.
3. Allow only `http` and `https` for remote fetch.
4. Block localhost, private IPs, link-local addresses, and cloud metadata hosts.
5. Apply a timeout on remote fetch.
6. Limit redirects and response body size for remote fetch.
7. Rate-limit network APIs.
8. Do not store tool input or output.
9. Analytics events may include the tool id only. Do not include input or output.

## Current controls

| Control | Location |
|---------|----------|
| SSRF checks | `server/utils/network/ssrf.ts` |
| Rate limit | `server/utils/network/rate-limit.ts` |
| Safe fetch | `server/utils/network/http.ts` |
| Analytics stub | `app/composables/useToolAnalytics.ts` |

## Residual risk

DNS rebinding can change a host address after the SSRF check and before fetch. Phase 2 can add a reconnect check.
