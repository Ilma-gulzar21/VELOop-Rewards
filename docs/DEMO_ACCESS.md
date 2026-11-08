# VELOop Rewards – Demo Access (NON-PRODUCTION)

> These are **demo-only** accounts on a **demo database** created by `npm run seed:demo`.
> They are not production credentials and grant access to no real data or real payouts.
> Never use these values on a production database.

## 1. Live links  (fill in before submitting)

| Item | URL |
|---|---|
| Frontend | `https://<your-app>.vercel.app` |
| User login | `https://<your-app>.vercel.app/login` |
| Admin login | `https://<your-app>.vercel.app/admin/login` |
| Backend health | `https://<your-backend>.onrender.com/api/health` |
| GitHub repository | `https://github.com/<you>/<repo>` |

Local development: frontend `http://localhost:5173`, backend `http://localhost:5000`.

## 2. Demo credentials

| Role | Email | Password | Notes |
|---|---|---|---|
| Super Admin | `demo.admin@veloop.demo` | `DemoAdmin@2026` | Full admin panel |
| User (can redeem) | `demo.user@veloop.demo` | `DemoUser@2026` | 15,000 VEs |
| User (low balance) | `demo.lowbalance@veloop.demo` | `DemoUser@2026` | 500 VEs – shows not-eligible / insufficient-balance states |

If you changed `DEMO_*` values in the backend env, update this table to match.
On the demo deployment the login pages also show a **Demo credentials** panel (`VITE_DEMO_MODE=true`) with a one-click fill button. It is disabled in production builds.

## 3. Reset the demo data

```bash
cd Backend
# .env must contain DEMO_MODE=true and the demo database MONGO_URI
npm run seed:demo
```

This is safe to repeat. It: recreates/unlocks the demo admin and resets its password, restores the three payout methods to enabled, restores the demo reward options (cost, enabled), resets demo users' passwords, wallets, redemption requests and ledger entries.
It refuses to run unless `DEMO_MODE=true`.

## 4. Suggested evaluation path

1. Log in as `demo.user`, open `/Payout?method=upi` (also `amazon`, `googlePlay`), choose a reward, enter details, review, confirm. A reference ID is shown and the request appears in History as `PENDING`.
2. Log in as `demo.lowbalance` to see the not-eligible / almost-eligible / insufficient-balance states.
3. Log in as the admin: Dashboard → Redemptions → open the request → approve / reject (reason) / complete (provider reference). Reject refunds the VEs once.
4. Admin → Payout Management: change a reward's VE requirement or disable a method with a reason; reload the user payout page and try to redeem – the backend enforces the change.
5. Admin → Transactions and Audit Logs to see the ledger and the actions above.

## 5. API authentication

Protected requests use `Authorization: Bearer <token>`. User and admin tokens are different and not interchangeable.
Admin login: `POST /api/admin/login`. User login: `POST /api/auth/login`.

## 6. Security note

Real secrets (JWT secrets, `PAYOUT_ENCRYPTION_KEY`, database credentials) live only in the hosting provider's environment variables and are never committed.
