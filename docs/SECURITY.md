# VELOop Rewards – Security Documentation

## 1. Overview

VELOop Rewards implements security measures to protect user accounts, wallet balances, redemption requests, and administrative operations.

## 2. Authentication and Authorization

- JSON Web Tokens (JWT) are used for authentication.
- User and admin authentication use separate JWT secrets.
- User and Super Admin routes are protected using separate middleware.
- The administrative console permits only the `super_admin` role.
- Admin sessions can be invalidated server-side during logout using a token version.
- Protected APIs require a valid Bearer token.
- Tokens have an expiry time.
- User and admin roles are checked before granting access.
- The backend checks whether the authenticated account exists and is active.

## 3. Password Security

- User passwords are hashed using bcryptjs.
- Password hashing uses a salt factor of 12.
- Plain-text passwords are not stored in the database.
- Password fields are excluded from normal user queries.
- Password comparison is performed using bcrypt.

## 4. Input Validation

- Authentication inputs are validated using Zod schemas.
- Server-side validation is used for incoming requests.
- Invalid requests are rejected with appropriate error responses.
- Wallet and redemption operations are validated on the backend.

## 5. API Security

The backend uses the following security measures:

- Helmet for HTTP security headers.
- CORS configuration to control permitted origins.
- JSON request body size limit of 10 KB.
- Rate limiting on authentication, redemption quote, redemption submission, and admin API endpoints.
- Super Admin login is temporarily locked after five consecutive failed password attempts.
- Protected user and admin API routes.
- Centralized error handling.
- Generic error responses to avoid exposing internal stack traces.

## 6. Rate Limiting

Authentication endpoints have rate limits:

| Endpoint | Maximum Requests | Time Window |
|---|---:|---|
| User Signup | 5 | 1 hour |
| User Login | 10 | 15 minutes |
| Admin Login | 5 | 15 minutes |
| Redemption Quote | 30 | 1 minute |
| Redemption Submission | 10 | 15 minutes |
| Admin API | 300 | 15 minutes |

These limits help reduce automated abuse and repeated login attempts.

## 7. Wallet and Redemption Security

- Wallet operations are processed by the backend.
- Users cannot directly set their wallet balance through frontend input.
- Redemption requests require user authentication.
- Redemption details are restricted to their respective owners.
- Idempotency keys help prevent duplicate financial operations.
- Rejected or failed redemptions refund VEs within a MongoDB transaction. The original redemption debit is marked `REVERSED`, and the refund transaction is linked to the redemption record.
- Sensitive payout details are masked in the admin redemption list and shown only on the protected detail endpoint.
- Admin operations require admin authentication.

## 8. Environment Variables

Sensitive configuration is stored in environment variables.

Examples:

- `MONGO_URI`
- `JWT_SECRET`
- `ADMIN_JWT_SECRET`
- `PORT`
- `CLIENT_ORIGIN` (with `FRONTEND_URL` as a compatibility fallback)

Actual secret values must never be committed to a public Git repository.

## 9. Error Handling

The backend uses centralized error handling to return appropriate HTTP status codes and messages without exposing internal stack traces to clients.

## 10. Security Recommendations

- Use HTTPS in production.
- Use strong, unique JWT secrets.
- Keep environment files private.
- Never share admin credentials publicly.
- Regularly update dependencies.
- Restrict production CORS origins to trusted frontend domains.
- Use a secured MongoDB Atlas connection in production.
- Review audit logs for administrative activities.

## Configuration change controls

Changes to global redemption settings require a 5–250 character reason and are audited with old/new configuration snapshots. Disabling/enabling payout methods and reward options, and changing a reward's required VE amount, also require a reason at the API layer. Public payout settings expose only user-facing notice/instruction text, never administrative limits or internal configuration.

## Payout-detail encryption (AES-256-GCM)

Payout destination details (UPI ID and delivery email) are encrypted before being persisted. Configure `PAYOUT_ENCRYPTION_KEY` as a base64-encoded 32-byte key. Generate one with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Keep this key outside source control and keep a secure backup. Losing or rotating the key without decrypt/re-encrypt migration makes stored payout details unreadable. Before enabling the updated app against an existing database, take a database backup, set the key, then run `npm run migrate:sensitive-payout-data` from `Backend`. The migration encrypts legacy plaintext payout details and backfills missing reward snapshots; it does not delete records.

Only authorized admin redemption-detail endpoints decrypt payout details. Admin list responses continue to mask them. Do not log decrypted values.

## Additional controls (V6)
- **Idempotency fingerprint:** an idempotency key bound to one logical request; reuse with a different reward/destination returns 409.
- **Changed-requirement guard:** the server never trusts a client price. An optional `expectedRequiredVEs` only triggers `409 CONFIG_CHANGED` if the live DB value differs.
- **Payout restriction** is verified inside the redemption DB transaction.
- **Demo mode:** `seed:demo` refuses to run without `DEMO_MODE=true`; the frontend Demo Credentials panel renders only when `VITE_DEMO_MODE=true`. Both must be off in production. Demo passwords are documented only as demo-only values.
- **Startup validation:** the server refuses to start without `PAYOUT_ENCRYPTION_KEY` (32-byte base64).
