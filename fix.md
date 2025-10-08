# Backend API Findings

## Critical / High Priority
- ~~**Password change saves an unresolved promise**~~ ✅ FIXED  \
  - File: `src/app/api/auth/change-password/route.ts:91`  \
  - Problem: `const hashedNewPassword = hashPassword(newPassword);` omits `await`, so Prisma receives a Promise-like value. Future logins compare plain text against a stringified object.  \
  - Fix: `const hashedNewPassword = await hashPassword(newPassword);` and pass the resolved string to Prisma.

- ~~**Authenticated request objects are never hydrated**~~ ✅ FIXED  \
  - Files: e.g. `src/app/api/users/[userId]/route.ts`, `src/app/api/cards/[cardId]/route.ts`, others expecting `req.user`.  \
  - Problem: `middleware.ts` only injects `x-user-data` headers; it never sets `req.user`, so every route immediately rejects as unauthenticated.  \
  - Fix: Updated `withAuth` wrapper to provide both `req.user` AND `user` parameter. Middleware now strips spoofed auth headers before setting trusted `x-user-data`. Key routes converted to use `withAuth` pattern. `getAuthenticatedUser` reads from header for performance (no redundant token verification).

- **Direct payment-method updates bypass encryption & validation**  \
  - File: `src/app/api/users/[userId]/payment-methods/route.ts:118`  \
  - Problem: PATCH accepts arbitrary arrays and writes them to `user.paymentMethods` without encryption or structure checks, enabling plaintext card storage.  \
  - Fix: Block this route or funnel writes through the secure helpers used by `/api/users/me/payment-methods` (encrypt, dedupe, enforce schema).

## Medium Priority
- **Middleware token parsing is brittle**  \
  - File: `src/middleware.ts:170-198`  \
  - Problem: relies on `parseTokenFromCookie` string splitting; multi-cookie headers or differing formatting break auth.  \
  - Fix: use `request.cookies.get` for both access and refresh tokens.

- **CSRF origin whitelist is too narrow**  \
  - File: `src/lib/csrf.ts:95-123`  \
  - Problem: only allows a handful of origins; local aliases like `http://127.0.0.1:3000` or staging domains fail OPTIONS/POST.  \
  - Fix: expand the list or fall back to comparing the request host to trusted domains.

- **RBAC grants don’t match actual card access**  \
  - Files: `src/lib/rbac.ts`, routes under `src/app/api/cards/**`  \
  - Problem: non-admin roles only have `cards:read:own`, but the GET endpoints serve global data. This either violates RBAC or returns 403 when middleware starts enforcing grants.  \
  - Fix: add `read:any` (and other necessary actions) for USER/SELLER or tighten route queries to enforce ownership.

## Low Priority / Hardening
- **Rate limiting increments on invalid quick-search input**  \
  - File: `src/app/api/search/quick/route.ts:37-52`  \
  - Problem: increments counters before validation, letting attackers exhaust quotas with malformed requests.  \
  - Fix: validate parameters first, then record attempts.

- **`validateRequestSize` can throw on FormData-derived payloads**  \
  - Files: `src/app/api/cards/[cardId]/route.ts:131`, `src/lib/api_utils.ts:143-151`  \
  - Problem: JSON-stringifying payloads containing `File` objects throws, which returns a 500.  \
  - Fix: detect `File`/binary entries before serialization or skip size checks for multipart requests.

- **Forgot-password flow lacks per-email throttling & token hashing**  \
  - File: `src/app/api/auth/forgot-password/route.ts`, `src/app/api/auth/reset-password/route.ts`  \
  - Problem: attackers can enumerate emails by timing responses; reset tokens are stored in plaintext.  \
  - Fix: add per-email rate limits and store hashed reset tokens (compare with timing-safe checks).
