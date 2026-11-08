# VELOop Rewards – Testing Documentation

## 1. Introduction

This document describes the testing process followed for the VELOop Rewards application.

The application consists of a React frontend, Node.js and Express backend, and MongoDB database.

## 2. Testing Environment

| Component | Technology |
|---|---|
| Frontend | React.js, Vite |
| Backend | Node.js, Express.js |
| Database | MongoDB |
| API Testing | Hoppscotch |
| Authentication | JWT |
| Password Security | bcryptjs |

### Local URLs

- Frontend: http://localhost:5173
- Backend: http://localhost:5000

## 3. Authentication Testing

| Test Case | Expected Result |
|---|---|
| Register with valid details | User account created |
| Register with existing email | Duplicate registration rejected |
| Login with correct credentials | Login successful |
| Login with incorrect password | Authentication rejected |
| Access protected API without token | 401 Unauthorized |
| Access protected API with invalid token | 401 Unauthorized |
| Access protected API with valid token | Request successful |
| Access with inactive user account | Access rejected |
| Five consecutive failed Super Admin passwords | Login temporarily locked |
| Super Admin logout | Current admin token rejected |

## 4. Wallet Testing

| Test Case | Expected Result |
|---|---|
| View wallet details | Wallet information returned |
| View transaction history | Transaction records returned |
| Access wallet without login | Request rejected |
| Admin credits wallet | Balance updated |
| Admin debits wallet | Balance updated |
| Debit more than available balance | Operation rejected |
| Repeat an idempotency key | Duplicate operation rejected |

## 5. Payout Testing

| Test Case | Expected Result |
|---|---|
| Get payout methods | Available methods returned |
| Get reward options | Available reward options returned |
| View UPI payout option | UPI options returned |
| View Amazon payout option | Amazon options returned |
| View Google Play payout option | Google Play options returned |
| Admin creates payout method | Method created |
| Admin updates payout method | Method updated |
| Admin creates reward option | Option created |
| Admin updates reward option | Option updated |

## 6. Redemption Testing

| Test Case | Expected Result |
|---|---|
| Request redemption quote | Quote returned |
| Submit valid redemption | Redemption created |
| Submit invalid redemption | Request rejected |
| Submit without authentication | Request rejected |
| Submit duplicate idempotency key | Duplicate request rejected |
| View redemption history | User's records returned |
| View redemption details | Authorized details returned |
| Access another user's redemption | Access denied |

## 7. Admin Testing

| Test Case | Expected Result |
|---|---|
| Admin login with valid credentials | Login successful |
| Admin login with invalid credentials | Login rejected |
| Admin login lockout | Five failed attempts trigger temporary lockout |
| Admin logout | Current token invalidated server-side |
| Suspend/restore user | User access updated and audit logged |
| Access admin API without admin token | Access rejected |
| View dashboard statistics | Statistics returned |
| View users | User list returned |
| View user details | User details returned |
| View transactions | Transaction records returned |
| Manage redemptions | Redemption records managed |
| Update redemption status | Status updated according to workflow |
| View audit logs | Audit records returned with server-side pagination and filters |
| Read payout settings | Public endpoint returns only user-facing guidance |
| Update payout settings | Super Admin update succeeds only with valid values and change reason |
| Invalid minimum/maximum | Backend rejects minimum greater than maximum |
| Redemption rule enforcement | Quote and creation reject rewards outside configured limits |
| Daily request limit | Further user redemption is rejected after configured daily limit |
| Sensitive payout configuration | Disabling a method or changing required VEs requires a reason |
| Redemption list sensitive fields | UPI IDs and email addresses masked |
| Rejected/failed redemption | VE refund created and original debit reversed |

## 8. Security Testing

- User and admin authentication tested separately.
- Protected routes tested without tokens.
- Invalid token handling tested.
- Inactive user access checked.
- Password hashing implemented.
- Authentication rate limiting configured.
- Server-side validation implemented.
- Centralized error handling configured.

## 9. API Testing Tool

Hoppscotch was used to test backend API endpoints.

Authentication tokens were passed through the Authorization header:

`Authorization: Bearer <TOKEN>`

## 10. Testing Summary

The source includes the described workflows and automated syntax checks for backend JavaScript. A live MongoDB integration/regression run is still required before submission. Do not mark a scenario as passed until it has been executed against the configured development database.

## 11. Final Verification Checklist

- [ ] User authentication
- [ ] Admin authentication
- [ ] Wallet operations
- [ ] Payout methods
- [ ] Reward options
- [ ] Redemption workflow
- [ ] Admin dashboard
- [ ] User management
- [ ] Transaction management
- [ ] Audit logs
- [ ] Global redemption settings and server-side enforcement
- [ ] Security verification
- [ ] Frontend responsiveness
- [ ] Production deployment
## New lifecycle/filter/security checks

- [ ] Admin redemption search by exact user ObjectId, name, email and reference; test date range and sort direction.
- [ ] Dashboard date range changes status totals, reserved/deducted VE totals and recent activity.
- [ ] Completing an approved redemption without `providerReference` returns 400; with a valid reference it is stored and visible in admin details.
- [ ] Admin user detail includes paginated redemption history.
- [ ] Payout restriction blocks quote and create with 403 while user login and wallet access remain available; restore reverses the restriction.
- [ ] Admin transactions support search and date filtering.
- [ ] Failed admin login attempts create `ADMIN_LOGIN_FAILED`/`ADMIN_LOGIN_BLOCKED` audit events.
- [ ] New redemptions persist rewardSnapshot and encrypted payout details; verify DB values do not contain plaintext UPI/email.
- [ ] Run `npm run migrate:sensitive-payout-data` only after a DB backup and encryption-key configuration; verify old records are encrypted and remain readable to authorized admin details.
- [ ] User can cancel only PENDING redemptions; verify full refund ledger entry, original debit reversal, and rejection after UNDER_REVIEW.
- [ ] Almost-eligible reward state shows shortfall/progress and Start Earning action; confirm dialogs support role, aria-modal and Escape.


## Automated integration tests (Part H scenarios)

File: `Backend/tests/api.integration.test.js` (Node built-in test runner, no extra dependencies).

```bash
cd Backend
DEMO_MODE=true npm run seed:demo                              # clean state
REDEMPTION_CREATE_LIMIT=200 REDEMPTION_QUOTE_LIMIT=200 npm start   # separate terminal
npm run test:integration                                      # API_URL=... for a deployed backend
```

| Scenario | Expected result |
|---|---|
| No token / fake token / user token on admin APIs / spoofed role header | 401 or 403 |
| Wrong admin password | 401 |
| Invalid UPI, invalid email, missing idempotency key | 400, balance unchanged |
| Body with `requiredVEs: 1`, `status: approved`, other `userId`, fake balance | Ignored; server price, `PENDING`, authenticated owner |
| Other user reads my redemption | 404 |
| 4 parallel requests, same idempotency key | One redemption, one deduction |
| Same key, different destination | 409 |
| Two parallel redemptions exceeding balance | Exactly one 201, one 400, balance never negative |
| Insufficient balance | 400 + not eligible quote with shortfall |
| Invalid / repeated admin transitions | 400; reject refunds exactly once |
| Admin changes cost; stale `expectedRequiredVEs` | 409 `CONFIG_CHANGED`; fresh request charged new cost; snapshot stores it |
| Invalid config values (-5, 0, 1.5, "abc") | 400 |
| Method disabled by admin | New redemption rejected by the API |
| Ledger / audit | `REDEEM` and `REFUND` rows and audit logs exist |

**Evidence.** Paste the output of `npm run test:integration` from your deployed/demo run here before submission:

```text
(not yet recorded – run the suite and paste the result)
```

## Known limitations
- The integration suite needs a reachable MongoDB replica set; it could not be executed in the offline packaging environment, so results must be generated by the submitter.
- Frontend UI/responsive/accessibility checks are manual (browser) checks.
- Reward denominations still need confirmation – see `docs/REWARD_VALUES_TO_CONFIRM.md`.
