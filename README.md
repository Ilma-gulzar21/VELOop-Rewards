# VELOop Rewards

A Full Stack Rewards and Payout Management System designed to manage VE wallet balances, reward redemptions, payout requests and administrative operations.

## Project Overview

VELOop Rewards is a web-based rewards management platform where users can manage their VE wallet, explore available reward options, redeem rewards and track their redemption history.

The platform also provides an administrative dashboard to manage users, review redemption requests and process payout operations.

## Key Features

### User Features
- Secure User Registration and Login
- JWT-based Authentication
- VE Wallet Management
- Wallet Transaction History
- Available Reward Options
- Reward Redemption
- Redemption History
- Redemption Status Tracking
- Payout Management
- User Profile Management

### Admin Features
- Separate Admin Authentication
- Admin Dashboard
- User Management
- Redemption Management
- Review and Process Redemption Requests
- Approve or Reject Redemption Requests
- Complete or Fail Payout Operations
- Audit Logs

### Security Features
- Password Hashing
- JWT Authentication
- Protected API Routes
- Role-based Authorization
- Input Validation
- API Rate Limiting
- Payout Details Encryption

## Technology Stack

### Frontend
- React.js
- Vite
- React Router
- Bootstrap
- Framer Motion
- Lucide React
- Axios
- CSS

### Backend
- Node.js
- Express.js
- REST APIs
- JWT Authentication
- bcryptjs
- Mongoose

### Database
- MongoDB

### Development Tools
- Visual Studio Code
- Git & GitHub
- Hoppscotch
- npm

## Project Structure

```text
VELOop-Rewards/
│
├── Backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   └── validators/
│   ├── docs/
│   ├── seed/
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   └── services/
│   ├── public/
│   ├── .env.example
│   └── package.json
│
├── docs/
├── postman/
├── .gitignore
└── README.md
```

## Installation and Setup

### Prerequisites

Make sure you have installed:

- Node.js
- npm
- MongoDB Atlas account or a MongoDB replica set
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/Ilma-gulzar21/VELOop-Rewards.git
```

```bash
cd VELOop-Rewards
```

### 2. Backend Setup

```bash
cd Backend
```

Install dependencies:

```bash
npm install
```

Create a `.env` file inside the Backend folder using `.env.example` as a reference.

Configure the following variables:

- PORT
- MONGO_URI
- JWT_SECRET
- ADMIN_JWT_SECRET
- FRONTEND_URL
- CLIENT_ORIGIN
- ADMIN_SEED_EMAIL
- ADMIN_SEED_PASSWORD
- PAYOUT_ENCRYPTION_KEY

Use your own secure credentials and MongoDB connection string.

**Important:** MongoDB transactions require a replica set. MongoDB Atlas is recommended.

Start the backend:

```bash
npm run dev
```

Backend URL:

```text
http://localhost:5000
```

### 3. Frontend Setup

Open a new terminal:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Create a `.env` file using `.env.example`.

Configure:

```env
VITE_API_URL=http://localhost:5000/api
```

Start the frontend:

```bash
npm run dev
```

Frontend URL:

```text
http://localhost:5173
```

## Environment Variables

Both frontend and backend require environment configuration.

Refer to:

- `Backend/.env.example`
- `frontend/.env.example`

Never upload actual `.env` files or sensitive credentials to GitHub.

## Database Configuration

The application uses MongoDB with Mongoose.

MongoDB transactions are required for certain wallet, redemption and refund operations. Therefore, a MongoDB replica set configuration is necessary.

MongoDB Atlas is recommended.

## API

The backend exposes REST API endpoints for:

- Authentication
- Wallet Management
- Reward Redemptions
- Payout Processing
- Admin Operations
- Audit Logs

Base URL:

```text
http://localhost:5000/api
```

## Future Enhancements

- Production Deployment
- Live Notifications
- Downloadable Redemption Receipts
- Enhanced User Experience
- Additional Reward Options

## Author

**Ilma Gulzar**

MCA Student | Full Stack Developer

GitHub: [Ilma-gulzar21](https://github.com/Ilma-gulzar21)

## License

This project is currently available for educational and portfolio purposes.