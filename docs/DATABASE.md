# VELOop Rewards – Database Documentation

## 1. Introduction

VELOop Rewards uses MongoDB as its database and Mongoose as its Object Data Modeling (ODM) library.

The database stores user accounts, wallets, transactions, payout configurations, redemption requests, and administrative records.

## 2. Database Information

| Property | Value |
|---|---|
| Database | MongoDB |
| ODM | Mongoose |
| Database Name | veloop_rewards |
| Backend | Node.js and Express.js |

## 3. Database Models

The application contains the following Mongoose models:

| Model | Purpose |
|---|---|
| User | Stores registered user information |
| Admin | Stores administrator account information |
| Wallet | Stores user wallet balances |
| Transaction | Stores wallet transaction records |
| PayoutMethod | Stores available payout methods |
| RewardOption | Stores configurable reward options |
| Redemption | Stores user redemption requests |
| AuditLog | Stores administrative activity records |

## 4. User Model

The User model stores:

- Name
- Email
- Password (hashed)
- Role
- Account active status
- Created and updated timestamps

Passwords are hashed using bcryptjs before storage.

## 5. Admin Model

The Admin model manages administrator accounts and authentication information.

Admin access is protected using separate admin authentication middleware and JWT configuration.

## 6. Wallet Model

The Wallet model maintains user wallet information.

Wallet-related information includes:

- User reference
- Available balance
- Total earned VEs
- Total redeemed VEs

Each wallet is associated with a user account.

## 7. Transaction Model

The Transaction model maintains wallet-related financial records.

Transaction information includes:

- User reference
- Wallet reference
- Transaction type
- Amount
- Balance before transaction
- Balance after transaction
- Transaction status
- Description
- Idempotency key
- Performed by
- Timestamps

Transaction records help maintain a history of wallet activities.

## 8. PayoutMethod Model

The PayoutMethod model stores available payout methods.

Supported method keys:

- upi
- amazon
- googlePlay

It also stores method information and availability configuration.

## 9. RewardOption Model

The RewardOption model stores reward configurations.

It maintains information such as:

- Payout method reference
- Reward value
- Required VEs
- Currency
- Description
- Availability status
- Display order

Reward options can be managed by authorized administrators.

## 10. Redemption Model

The Redemption model stores user reward redemption requests.

Important information includes:

- Reference ID
- Idempotency key
- User reference
- Payout method reference
- Reward option reference
- Method key
- Reward value
- Required VEs
- Payout details
- Redemption status
- Admin note
- Processed by
- Refund information
- Completion timestamp
- Status history
- Created and updated timestamps

Supported redemption statuses:

- PENDING
- UNDER_REVIEW
- APPROVED
- REJECTED
- COMPLETED
- FAILED

## 11. AuditLog Model

The AuditLog model stores administrative activity records.

It helps maintain an audit trail of administrative operations.

## 12. Database Relationships

The application uses MongoDB document references through Mongoose.

Main relationships:

- User → Wallet
- User → Transaction
- User → Redemption
- PayoutMethod → RewardOption
- Redemption → User
- Redemption → PayoutMethod
- Redemption → RewardOption
- Admin → Administrative activity records

## 13. Database Security

- Passwords are stored as hashes.
- Sensitive configuration is stored in environment variables.
- Protected APIs require authentication.
- User-specific records are accessed through authenticated ownership checks.
- Administrative operations require admin authorization.

## 14. Conclusion

The MongoDB database provides persistent storage for the VELOop Rewards platform.

Its models support user management, wallet accounting, reward configuration, redemption processing, and administrative auditing.

## Redemption Ledger References

New redemption records store a snapshot of the payout currency and references to the original VE debit transaction and any refund transaction. When upgrading an existing database, run `npm run migrate:ledger` once from the `Backend` directory to backfill available references and reverse the original debit ledger status for already-refunded requests. The migration does not create or change wallet balances.


## SystemSetting

A singleton `SystemSetting` document (key `global`) stores optional `minRequiredVEs`, `maxRequiredVEs`, and `maxRequestsPerDay` controls plus user-facing processing guidance. Unset numeric limits are disabled. The quote and redemption creation APIs enforce configured limits. Administrative updates require a change reason and create an audit record.


## Wallet accounting model and redemption lifecycle

**Model: deduct on submission, refund on unsuccessful outcome.**

| Moment | Wallet | Ledger | Request |
|---|---|---|---|
| User confirms redemption | `availableBalance -= requiredVEs`, `totalRedeemed += requiredVEs` (conditional update, same DB transaction) | `REDEEM` transaction (balanceBefore/After) | `PENDING`, `walletTransactionId` set |
| Admin → `UNDER_REVIEW` / `APPROVED` | unchanged | unchanged | status history entry |
| Admin → `COMPLETED` (needs `providerReference`) | unchanged | unchanged | final |
| Admin → `REJECTED` or `FAILED` (reason required) | refunded once | `REFUND` transaction; original `REDEEM` marked `REVERSED` | `refunded = true`, `refundTransactionId` set |
| User cancels while `PENDING` | refunded once | `REFUND`; original `REDEEM` marked `REVERSED` | `CANCELLED` |

Allowed transitions: `PENDING → UNDER_REVIEW | APPROVED | REJECTED | CANCELLED(user)`, `UNDER_REVIEW → APPROVED | REJECTED`, `APPROVED → COMPLETED | FAILED`. `COMPLETED`, `REJECTED`, `FAILED`, `CANCELLED` are final.
A refund can happen once: guarded by the `refunded` flag and the unique ledger `idempotencyKey` (`refund-<id>` / `cancel-refund-<id>`).

> Business-policy note: this refund model is the implementation's chosen model and must be confirmed with the assignment owner (the brief says not to invent policy).

**Idempotency.** A redemption is identified by `(user, idempotencyKey)` (unique index). The request also stores a SHA-256 `requestFingerprint` of the logical request; reusing a key with a different reward/destination returns `409 IDEMPOTENCY_KEY_REUSED`.

**Changed requirement.** The UI may send `expectedRequiredVEs` (what the user saw). It is never used as a price; if it differs from the current DB value the API returns `409 CONFIG_CHANGED` with the new cost and nothing is deducted.
