# VELOop Rewards – Admin Guide

## 1. Introduction

The Admin Panel allows authorized administrators to manage users, wallets, transactions, payout methods, reward options, and redemption requests.

Only authenticated administrators can access protected admin features.

## 2. Admin Login

1. Open the VELOop Rewards application.
2. Navigate to the Admin Login page.
3. Enter the admin email and password.
4. Submit the login form.
5. After successful authentication, access the admin dashboard.

Admin login API:

`POST /api/admin/login`

Admin APIs require the admin JWT token:

`Authorization: Bearer <ADMIN_TOKEN>`

## 3. Admin Dashboard

The dashboard provides an overview of the platform through statistics retrieved from:

`GET /api/admin/dashboard/stats`

Administrators can use the dashboard to monitor platform activity.

## 4. User Management

Admin API:

- `GET /api/admin/users` – View registered users.
- `GET /api/admin/users/:userId` – View individual user details.

The user management section supports viewing user information and account status.

## 5. Wallet Management

Administrators can credit or debit user wallets.

### Credit Wallet

`POST /api/admin/wallet/credit`

### Debit Wallet

`POST /api/admin/wallet/debit`

All wallet operations should be performed carefully and verified through transaction records.

## 6. Transaction Management

API:

`GET /api/admin/transactions`

Administrators can view transaction records and review wallet-related activities.

## 7. Payout Method Management

Administrators can manage available payout methods.

Supported methods:

- UPI Cash
- Amazon Gift Card
- Google Play Gift Card

Available operations:

- View payout methods.
- Create payout methods.
- Update payout method details.
- Enable or disable payout methods.

## 8. Reward Option Management

Administrators can manage reward options associated with payout methods.

Available operations:

- View reward options.
- Create reward options.
- Update reward values.
- Update required VEs.
- Enable or disable reward options.

Reward configuration should be updated carefully because it affects user redemption eligibility.

## 9. Redemption Management

Administrators can view redemption requests and update their statuses.

Available statuses:

- PENDING
- UNDER_REVIEW
- APPROVED
- REJECTED
- COMPLETED
- FAILED

### Redemption Workflow

1. A user submits a redemption request.
2. The request appears with PENDING status.
3. The administrator reviews the request.
4. The administrator may move it to UNDER_REVIEW or APPROVED, or reject it.
5. An approved request can be marked COMPLETED or FAILED.
6. Rejected or failed requests follow the backend refund process.

### APIs

- `GET /api/admin/redemptions`
- `GET /api/admin/redemptions/:redemptionId`
- `PATCH /api/admin/redemptions/:redemptionId/status`

Administrators should verify redemption details before changing the status.

## 10. Audit Logs

API:

`GET /api/admin/audit-logs`

Audit logs help administrators review recorded administrative activities.

## 11. Important Security Guidelines

- Keep admin credentials confidential.
- Never share the admin JWT token.
- Do not expose environment variables.
- Verify user and redemption details before performing wallet or status operations.
- Review audit logs regularly.
- Use the admin account only for authorized management activities.

## 12. Logout

Use the Logout option in the admin interface when the administrative session is complete.

## Global Redemption Settings

Open **Admin → Settings** to configure optional minimum/maximum required VE amounts, a per-user UTC-day request limit, and user-facing processing information. Leave a numeric limit empty to disable it. Save requires a reason; the backend validates the range, enforces the rules for both quotes and redemption creation, and writes an audit log. Only enter values approved by the assignment owner.

When disabling a payout method or reward option, or changing a reward's required VE amount, the UI asks for confirmation and a reason. The API independently enforces the reason requirement.
