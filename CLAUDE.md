# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a quiz application web project for IPSSI. It's a Node.js/Express backend application with MySQL database using Sequelize ORM, featuring role-based authentication and quiz management functionality.

**Tech Stack:**
- Backend: Node.js with Express.js (ES modules)
- Database: MySQL with Sequelize ORM
- Authentication: JWT with bcrypt for password hashing
- Frontend: Static HTML files served from `public/`

## Development Commands

### Running the Application
```bash
npm start          # Start the server on http://0.0.0.0:3000
node server.js     # Alternative way to start
```

### Environment Setup
Create a `.env` file based on `.env.example`:
```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=quizzeo
JWT_SECRET=your_secret_key
```

The database will automatically sync on startup via `sequelize.sync()`.

## Architecture

### Project Structure
```
.
├── server.js                    # Main application entry point
├── config/
│   └── database.js             # Sequelize database configuration
├── controllers/
│   ├── AuthController.js       # Login authentication logic
│   ├── TokenController.js      # JWT token creation/verification
│   ├── UserController.js       # User CRUD operations
│   └── LoggerController.js     # Request logging
├── seed.js                     # Database models (User, Quizz, Reponses)
└── public/                     # Static HTML frontend files
    ├── index.html
    ├── login.html
    ├── register.html
    ├── dashbadmin.html         # Admin dashboard
    ├── dashbecole.html         # School dashboard
    ├── dashbentreprise.html    # Company dashboard
    └── create_quiz.html
```

### Database Models

All models are defined in `seed.js`:

1. **User Model**
   - Fields: id, email, password (hashed), fullname, role, actif, createdAt
   - Roles: 'admin', 'ecole', 'entreprise', 'user'
   - `actif` boolean field controls user active/disabled status

2. **Quizz Model**
   - Fields: id, name, questions (JSON), ownerId, status, createdAt
   - Status values: 'pending', etc.
   - `questions` is stored as JSON

3. **Reponses Model**
   - Fields: id, quizzId, userId, answers (JSON), createdAt
   - Stores user answers to quizzes

### Authentication Flow

1. **Registration** (`POST /register`)
   - Creates user with bcrypt-hashed password
   - Validates role is one of: user, ecole, entreprise
   - Checks for existing email before registration

2. **Login** (`POST /login`)
   - Validates credentials with bcrypt.compare()
   - Issues JWT token via `createToken()` (30-day expiry by default)
   - Stores token in httpOnly cookie as JSON string

3. **Token Verification**
   - Tokens are stored in cookies as JSON strings: `JSON.parse(req.cookies.token)`
   - Use `verifyToken(token)` to decode and validate JWT
   - Check user exists and is active before granting access

### Key Routes & Authorization

- `GET /dashboard` - Role-based dashboard routing (requires authentication)
- `GET /users` - List all users (admin only)
- `GET /quizzes` - List quizzes for authenticated user (filtered by ownerId)
- `POST /quizzes` - Create quiz (ecole or entreprise role required)
- `GET /quizz/create` - Quiz creation page (ecole or entreprise only)

**Authorization Pattern:**
All protected routes follow this pattern:
1. Extract token from `req.cookies.token`
2. Parse JSON: `JSON.parse(tokenCookie)`
3. Verify with `verifyToken(token)`
4. Query database to check user exists, is active, and has required role

### Direct SQL Queries

This codebase uses raw SQL queries via `sequelize.query()` rather than Sequelize models for most operations. When writing queries:
- Use parameterized queries with `:placeholder` syntax
- Pass replacements object: `{ replacements: { placeholder: value } }`
- For JSON columns in MySQL, stringify data before insertion
- Results format: `[rows, metadata]` - typically destructure as `const [rows] = await sequelize.query(...)`

### Frontend

Static HTML files in `public/` directory are served via `express.static('public')`. Frontend makes fetch requests to backend API endpoints. Each role has a separate dashboard:
- Admin: `dashbadmin.html`
- School (ecole): `dashbecole.html`
- Company (entreprise): `dashbentreprise.html`

## Important Notes

- This project uses ES modules (`"type": "module"` in package.json)
- All imports must use `.js` extensions
- Database connection is initialized before starting the server in `server.js`
- Cookie-based authentication with httpOnly cookies storing JSON-stringified tokens
- Token expiry is 30 days by default
- The application runs on port 3000 by default
