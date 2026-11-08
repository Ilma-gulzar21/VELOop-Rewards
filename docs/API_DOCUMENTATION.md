# VELOop Rewards – API Documentation

## 1. Project Overview

VELOop Rewards is a MERN-based rewards and payout management system. Users can manage their wallets, view transactions, and redeem Virtual Earnings (VEs) for available rewards.

The system supports UPI Cash, Amazon Gift Cards, and Google Play Gift Cards.

## 2. Base URL

Local Backend:

`http://localhost:5000`

All API endpoints start with `/api`.

## 3. Authentication

### User Authentication

- Signup: `POST /api/auth/signup`
- Login: `POST /api/auth/login`
- Get Profile: `GET /api/auth/me`

Protected user APIs require:

`Authorization: Bearer <USER_TOKEN>`

### Admin Authentication

- Admin Login: `POST /api/admin/login`

Protected admin APIs require:

`Authorization: Bearer <ADMIN_TOKEN>`

User and admin tokens are separate.

## 4. User APIs

### Authentication

| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | `/api/auth/signup` | Register a new user | Public |
| POST | `/api/auth/login` | Login user | Public |
| GET | `/api/auth/me` | Get logged-in user profile | User |

### Wallet

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/api/wallet` | Get wallet details | User |
| GET | `/api/wallet/transactions` | Get transaction history | User |

### Payout Information

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/api/payouts/methods` | Get available payout methods | Public |
| GET | `/api/payouts/options` | Get available reward options | Public |

### Redemption

| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | `/api/redemptions/quote` | Get redemption quote | User |
| POST | `/api/redemptions` | Create redemption request | User |
| GET | `/api/redemptions/my` | Get user's redemption history | User |
| GET | `/api/redemptions/my/:redemptionId` | Get redemption details | User |

## 5. Admin APIs

### Admin Profile and Dashboard

| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | `/api/admin/login` | Admin login | Public |
| GET | `/api/admin/profile` | Get admin profile | Admin |
| GET | `/api/admin/dashboard/stats` | Get dashboard statistics | Admin |

### User Management

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/api/admin/users` | Get all users | Admin |
| GET | `/api/admin/users/:userId` | Get specific user details | Admin |

### Wallet Management

| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | `/api/admin/wallet/credit` | Credit user wallet | Admin |
| POST | `/api/admin/wallet/debit` | Debit user wallet | Admin |

### Transaction Management

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/api/admin/transactions` | Get all transactions | Admin |

### Payout Method Management

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/api/admin/payouts/methods` | Get all payout methods | Admin |
| POST | `/api/admin/payouts/methods` | Create payout method | Admin |
| PATCH | `/api/admin/payouts/methods/:methodId` | Update payout method | Admin |

### Reward Option Management

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/api/admin/payouts/reward-options` | Get reward options | Admin |
| POST | `/api/admin/payouts/reward-options` | Create reward option | Admin |
| PATCH | `/api/admin/payouts/reward-options/:optionId` | Update reward option | Admin |

### Redemption Management

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/api/admin/redemptions` | Get all redemption requests | Admin |
| GET | `/api/admin/redemptions/:redemptionId` | Get redemption details | Admin |
| PATCH | `/api/admin/redemptions/:redemptionId/status` | Update redemption status | Admin |

### Audit Logs

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/api/admin/audit-logs` | Get audit logs | Admin |

## 6. Supported Payout Methods

- UPI Cash (`upi`)
- Amazon Gift Card (`amazon`)
- Google Play Gift Card (`googlePlay`)

Available reward options and their required VEs are managed through the backend.

## 7. Redemption Statuses

- PENDING
- UNDER_REVIEW
- APPROVED
- REJECTED
- COMPLETED
- FAILED

Rejected or failed redemption requests follow the backend refund process.

## 8. Error Handling

The API returns JSON responses containing a success indicator and a message.

Common HTTP status codes:

| Status Code | Meaning |
|---|---|
| 200 | Request successful |
| 201 | Resource created |
| 400 | Invalid request |
| 401 | Authentication required or invalid token |
| 403 | Access denied |
| 404 | Resource not found |
| 409 | Conflict or duplicate request |
| 500 | Internal server error |

## 9. Security

- JWT-based user and admin authentication.
- Separate user and admin secrets.
- Password hashing using bcrypt.
- Protected routes.
- Helmet security headers.
- CORS configuration.
- Rate limiting on authentication endpoints.
- Server-side validation.

## 10. Local Development

Start the backend:

`cd backend`

`npm run dev`

Start the frontend in another terminal:

`cd frontend`

`npm run dev`

Backend: `http://localhost:5000`

Frontend: `http://localhost:5173`

## Additional Super Admin Security Endpoints

- `POST /api/admin/logout` — protected; invalidates the current Super Admin token.
- `PATCH /api/admin/users/:userId/status` — protected; requires `{ "isActive": true|false, "reason": "..." }` and records an audit log.

Admin audit log search supports `page`, `limit`, `action`, `entityType`, `adminId`, and `search` query parameters.


## Global payout settings (Super Admin)

- `GET /api/admin/settings` — returns global redemption limits and user-facing guidance. Requires an admin bearer token.
- `PATCH /api/admin/settings` — updates `minRequiredVEs`, `maxRequiredVEs`, `maxRequestsPerDay`, `processingInstructions`, and `userFacingMessage`. Requires an admin bearer token and a `changeReason` of 5–250 characters. Empty numeric limits (`null`) disable that limit.
- `GET /api/payouts/settings` — public read-only endpoint for the user-facing notice and processing instructions.

The backend enforces configured minimum/maximum required VE values and per-user daily request limits during quote and redemption creation. These controls default to unset and must only be configured using approved business rules.

### Additional administration and lifecycle endpoints

- `GET /api/admin/redemptions?search=&status=&method=&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&sortBy=createdAt&sortOrder=desc` supports reference, user name/email and user ObjectId search, date filtering and sorting.
- `PATCH /api/admin/redemptions/:redemptionId/status` requires `providerReference` (1–120 characters) when setting `status: COMPLETED`.
- `PATCH /api/admin/users/:userId/payout-restriction` accepts `{ "restricted": true, "reason": "..." }`; this blocks payout quote/create while leaving account login available.
- `GET /api/admin/transactions?search=&startDate=&endDate=&type=&status=` supports reference, description, user ID/name/email and date filters.
- `PATCH /api/redemptions/my/:redemptionId/cancel` lets a user cancel only a `PENDING` request. It atomically refunds VEs. Once an admin moves a request to `UNDER_REVIEW`, cancellation is no longer available.
