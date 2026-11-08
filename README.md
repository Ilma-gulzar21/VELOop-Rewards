# VELOop Rewards

VELOop Rewards is a full-stack MERN application that allows users to manage reward points (VEs) and redeem them for available payout options such as UPI Cash, Amazon Gift Cards, and Google Play Gift Cards.

The platform includes user authentication, wallet management, reward redemption, transaction history, and an admin panel for managing users, payouts, and redemption requests.

## Features

### User Features
- User registration and login.
- Secure JWT-based authentication.
- Personal wallet with available balance.
- Wallet transaction history.
- View available payout methods and reward options.
- Check redemption eligibility through redemption quotes.
- Redeem reward points for available rewards.
- View redemption history and redemption details.

### Admin Features
- Secure admin login.
- Admin dashboard with statistics.
- View and manage users.
- Credit and debit user wallets.
- View transactions.
- Manage payout methods and reward options.
- View and filter redemption requests.
- Update redemption statuses.
- View audit logs.

### Security
- Password hashing using bcrypt.
- JWT authentication.
- Separate user and admin authorization.
- Protected API routes.
- Request validation.
- Rate limiting for authentication routes.
- Security headers using Helmet.
- CORS configuration.
- Idempotency protection for wallet and redemption operations.

## Technology Stack

### Frontend
- React
- Vite
- React Router
- Axios
- Bootstrap
- Framer Motion
- Lucide React

### Backend
- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT
- bcryptjs
- Zod
- Helmet
- express-rate-limit

## Project Structure

```text
VELOop-payout-System/
│
├── Backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── scripts/
│   │   ├── services/
│   │   ├── utils/
│   │   └── server.js
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   └── services/
│   ├── .env.example
│   └── package.json
│
├── docs/
│   ├── API_DOCUMENTATION.md
│   ├── DATABASE.md
│   ├── SECURITY.md
│   ├── ADMIN_GUIDE.md
│   ├── TESTING.md
│   └── DEMO_ACCESS.md
│
├── postman/
│   └── VELOop_Rewards_API.postman_collection.json
│
└── README.md
```

## Installation and Setup

### Prerequisites

Install the following:
- Node.js 20+ and npm
- A MongoDB **replica set** (MongoDB Atlas free tier recommended). Redemptions and refunds use multi-document transactions, which a plain standalone local `mongod` does not support.

### 1. Clone the Repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
```

```bash
cd VELOop-payout-System
```

### 2. Backend Setup

```bash
cd Backend
npm install
```

Create a `.env` file inside the backend folder:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/veloop_rewards
JWT_SECRET=your_user_jwt_secret
ADMIN_JWT_SECRET=your_admin_jwt_secret
PAYOUT_ENCRYPTION_KEY=generate_with_command_below
CLIENT_ORIGIN=http://localhost:5173
ADMIN_SEED_NAME=VELOop Super Admin
ADMIN_SEED_EMAIL=your-admin-email@example.com
ADMIN_SEED_PASSWORD=replace_with_a_strong_password
```

Generate the payout encryption key (required; the server will not start without it) and keep a secure backup of it:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Replace the secret values with your own secure secrets.

### Quick start for reviewers / demo environment

On a **non-production** database you can create everything an evaluator needs in one command
(demo admin, demo users with VEs, payout methods and clearly-labelled DEMO reward options):

```bash
# Backend/.env: set DEMO_MODE=true
npm run seed:demo
```

Re-run the same command at any time to reset demo data. Credentials are listed in `docs/DEMO_ACCESS.md`.
To show the Demo Credentials panel on the login pages, set `VITE_DEMO_MODE=true` (and the `VITE_DEMO_*` values) in the frontend env of the **demo** deployment only.

> **Reward denominations.** The demo values are placeholders, not verified production values.
> Real denominations must be confirmed against the live VELoop payout pages and loaded via
> `Backend/seed/rewardOptions.verified.json` — see `docs/REWARD_VALUES_TO_CONFIRM.md`.

Create the Super Admin account once:

```bash
npm run seed:admin
```

After updating an existing database, backfill legacy redemption ledger references once:

```bash
npm run migrate:ledger
```

Initialize missing payout methods and reward denominations (from the confirmed `seed/rewardOptions.verified.json`, or the legacy `SEED_*` variables), plus an optional zero-balance demo user. If no verified denominations are provided the script warns that users will see no rewards:

```bash
npm run seed:data
```

Start the backend:

```bash
npm run dev
```

Backend runs at:

```text
http://localhost:5000
```

### 3. Frontend Setup

Open another terminal:

```bash
cd frontend
npm install
```

Create a `.env` file inside the frontend folder:

```env
VITE_API_URL=http://localhost:5000/api
```

Start the frontend:

```bash
npm run dev
```

Frontend runs at:

```text
http://localhost:5173
```

## API Documentation

Detailed API endpoints, request bodies, authentication requirements, and responses are documented in:

`docs/API_DOCUMENTATION.md`

## Database

The application uses MongoDB with Mongoose.

Main collections include:

- Users
- Admins
- Wallets
- Transactions
- PayoutMethods
- RewardOptions
- Redemptions
- AuditLogs

See `docs/DATABASE.md` for more information.

## Testing

API endpoints can be tested using Hoppscotch or the provided Postman collection.

Automated API/security tests (concurrency, duplicate submission, manipulation, ownership, lifecycle, refund-once, config change):

```bash
# terminal 1 (backend, with test-friendly rate limits)
REDEMPTION_CREATE_LIMIT=200 REDEMPTION_QUOTE_LIMIT=200 npm start
# terminal 2
DEMO_MODE=true npm run seed:demo && npm run test:integration
```

Postman collection:

`postman/VELOop_Rewards_API.postman_collection.json`

Testing instructions:

`docs/TESTING.md`

## Admin Guide

Admin authentication, dashboard functionality, wallet adjustments, payout management, and redemption processing are explained in:

`docs/ADMIN_GUIDE.md`

## Security Documentation

Security measures and authentication details are available in:

`docs/SECURITY.md`

## Demo Access

Demo account instructions are maintained separately in:

`docs/DEMO_ACCESS.md`

Do not publish real passwords, JWT secrets, or private credentials in this repository.

## Deployment

The application can be deployed using:
- A frontend hosting platform for the React application.
- A backend hosting platform for the Express API.
- MongoDB Atlas for the production database.

Production environment variables must be configured through the hosting provider's environment settings. The local MongoDB instance must run as a replica set because wallet and redemption operations use MongoDB transactions.

## Project Status

The application includes user authentication, wallet management, payout methods, reward redemption, admin management, and audit logging.

Production deployment and final verification should be completed before considering the application fully deployed.

## License

This project is developed for demonstration and learning purposes.

## Global redemption settings

Super Admins can configure optional minimum/maximum required VEs, a per-user UTC-day request limit, and user-facing processing guidance under **Admin → Settings**. Empty numeric limits are disabled. Every settings update requires a reason and is written to the audit log. These are project-level controls; only enter values approved by the VELoop assignment owner.


## Final development verification before deployment

1. Configure `Backend/.env` from `.env.example` with a replica-set MongoDB URI and separate user/admin JWT secrets.
2. Run `npm install` in `Backend` and `frontend`.
3. Run `npm run seed:admin` and `npm run seed:data` from `Backend` only after setting local demo credentials and approved reward values.
4. Start the backend and frontend, then execute every scenario in `docs/TESTING.md` using Hoppscotch and the browser.
5. Confirm the official payout denominations, VE conversion rates, and all policy wording with the assignment owner before configuring them. The repository intentionally does not invent production reward values.

The `Backend` directory uses an uppercase name in this archive. If deploying to a case-sensitive Linux host, keep references and deployment commands consistent with that exact directory name or rename the directory and update scripts accordingly.

## V5 pre-deployment updates

See `PRE_DEPLOYMENT_AUDIT.md` for the V5 changes and required checks. Before creating redemptions, configure `PAYOUT_ENCRYPTION_KEY` in `Backend/.env`. For an existing database, take a backup and run `npm run migrate:sensitive-payout-data` from `Backend` to encrypt legacy payout details and backfill reward snapshots. Do not lose the encryption key.
