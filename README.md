# Touch Grass API

A production-ready Node.js Express API with MongoDB for user authentication, built for the Touch Grass application.

## Features

- User registration and login
- JWT-based authentication
- Password hashing with bcrypt
- Role-based access (Parent/Kid)
- Family codes: parents get a code, kids log in with it
- Kid logins without email: parents create a username and 4-digit PIN for each kid
- Parental consent recorded at signup and for every kid, with a privacy policy at `/privacy`
- Full deletion: one kid, or the parent's whole account and all kid data
- Kid profiles managed by parents, linked to the kid's own login
- Gamified adventure: challenges, XP, levels, streaks and badges, with parent approval
- MongoDB database with Mongoose ODM
- Input validation and error handling
- CORS enabled
- Environment-based configuration

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (JSON Web Tokens)
- **Password Security**: bcryptjs
- **Environment Variables**: dotenv
- **Cross-Origin**: CORS

## Project Structure

```
touch-grass-backend/
├── src/
│   ├── models/
│   │   ├── User.js              # Parent & kid accounts (password hashing, family code)
│   │   ├── Kid.js               # Kid profiles managed by a parent
│   │   └── Completion.js        # Challenge completions (the only stored game state)
│   ├── routes/                  # URL -> middleware -> controller
│   │   ├── auth.js              # Authentication routes
│   │   ├── kids.js              # Kid profile routes
│   │   └── game.js              # Game routes
│   ├── validators/              # Request checks run before controllers
│   │   ├── auth.js
│   │   ├── kids.js
│   │   └── game.js
│   ├── controllers/             # HTTP only: read the request, call a service, respond
│   │   ├── authController.js    # Signup, login, current user
│   │   ├── kidController.js     # Kid profile CRUD
│   │   └── gameController.js    # Adventure, submissions, approvals
│   ├── services/                # Business logic; throw errors from utils/errors.js
│   │   ├── authService.js       # Accounts, logins, account deletion
│   │   ├── kidService.js        # Kid profiles, kid logins, kid data deletion
│   │   └── gameService.js       # Submitting and reviewing challenges
│   ├── middleware/
│   │   ├── auth.js              # JWT verification middleware
│   │   ├── checkRole.js         # Role guard (parent / kid)
│   │   ├── validate.js          # Runs a validator; rejects malformed ids
│   │   └── errorHandler.js      # Turns every error into a JSON response
│   ├── game/
│   │   ├── catalogue.js         # Regions, challenges and badges (in code, not the DB)
│   │   ├── rules.js             # Pure rules: XP, level, streak, badges, challenge status
│   │   └── progress.js          # Loads completions and builds summaries
│   ├── utils/
│   │   ├── errors.js            # NotFoundError, ConflictError, ValidationError, ...
│   │   └── kidLogin.js          # Kid username / PIN rules and PIN lockout
│   ├── config/
│   │   ├── db.js                # MongoDB connection
│   │   └── privacy.js           # Privacy policy version
│   ├── app.js                   # Express app: middleware, routes, error handler
│   └── server.js                # Connects to MongoDB and starts the app
├── test/                        # Rules tests and API tests (npm test)
├── migrate-link-kid-accounts.js # One-off: link pre-existing kid accounts to profiles
├── test-connection.js           # MongoDB connection check
├── test.http                    # API test requests
└── README.md                    # Documentation
```

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd touch-grass-backend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
# Copy and edit .env file
# Update MONGODB_URI and JWT_SECRET
```

4. Start MongoDB (if running locally):
```bash
mongod
```

5. Start the server:
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:3000`

## Environment Variables

Create a `.env` file in the root directory:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/touch-grass

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRE=7d

# Server Configuration
PORT=3000
NODE_ENV=development

# Game: timezone that decides which day a challenge counts for (streaks).
# Defaults to UTC.
APP_TIMEZONE=Africa/Nairobi
```

See `.env.example` for a template.

**Important**: Change `JWT_SECRET` to a strong random string in production.

## API Endpoints

### Base URL
```
http://localhost:3000
```

### Authentication Endpoints

#### 1. Signup (Register)
Create a parent account. Kids can't sign up themselves (`role: "kid"` returns
`403`); a parent creates their login instead (see `PUT /api/kids/:id/login`).

```http
POST /api/auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "consent": true   // required: the parent accepts the privacy policy at /privacy
}
```

The policy version and time of acceptance are stored on the user. Parents
receive a `familyCode` in the response.

**Success Response (201)**:
```json
{
  "success": true,
  "message": "User created successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "id": "65f1a2b3c4d5e6f7g8h9i0j1",
    "email": "user@example.com",
    "role": "parent",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Error Responses**:
- `400` - Validation error (missing fields, weak password, no consent)
- `403` - Tried to sign up as a kid
- `409` - Email already exists
- `500` - Server error

---

#### 2. Login
Authenticate an existing user.

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Success Response (200)**:
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "id": "65f1a2b3c4d5e6f7g8h9i0j1",
    "email": "user@example.com",
    "role": "parent",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Error Responses**:
- `400` - Missing email or password
- `401` - Invalid credentials
- `500` - Server error

---

#### Kid login
Kids log in with their parent's family code and the username and PIN their
parent set. Kid accounts never have an email address.

```http
POST /api/auth/kid-login
Content-Type: application/json

{
  "familyCode": "A3F2B1",
  "username": "amara",
  "pin": "0420"      // a string, so leading zeros survive
}
```

Returns the same shape as `login`. Every mismatch returns the same `401`
message. After 5 wrong PINs the login is locked for 15 minutes (`429`); a
parent can unlock it straight away by setting a new PIN.

---

#### 3. Get Current User
Get the authenticated user's profile.

```http
GET /api/auth/me
Authorization: Bearer <token>
```

**Success Response (200)**:
```json
{
  "success": true,
  "data": {
    "id": "65f1a2b3c4d5e6f7g8h9i0j1",
    "email": "user@example.com",
    "role": "parent",
    "kids": [],
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Error Responses**:
- `401` - No token, invalid token, or expired token
- `404` - User not found
- `500` - Server error

---

#### 4. Logout
Logout the current user.

```http
POST /api/auth/logout
```

**Success Response (200)**:
```json
{
  "success": true,
  "message": "Logout successful. Please remove the token from client storage."
}
```

> **Note**: With JWT, logout is primarily client-side. The client should delete the token from storage.

---

#### 5. Delete account
Deletes the parent's account and everything about their kids: profiles, kid
logins and challenge history. Parent only.

```http
DELETE /api/auth/me
Authorization: Bearer <token>
```

---

### Kid Profile Endpoints

All require `Authorization: Bearer <token>`.

| Method | Route | Role | Description |
|--------|-------|------|-------------|
| POST | `/api/kids` | parent | Add a kid (`name`, `age`, `consent: true` required; `interests`, `avatarColor` optional; `username` + `pin` to create their login at the same time) |
| GET | `/api/kids` | parent | List the parent's kids |
| GET | `/api/kids/:id` | parent | Get one of the parent's kids |
| PUT | `/api/kids/:id` | parent | Update `name`, `age`, `avatarColor`, `interests` |
| PUT | `/api/kids/:id/login` | parent | Create or change the kid's `username` and `pin`; also unlocks a locked login and removes any old email |
| DELETE | `/api/kids/:id` | parent | Delete a kid **and their login account and challenge history** |
| GET | `/api/kids/me` | kid | Get the kid's own profile |
| PUT | `/api/kids/me` | kid | Update own `avatarColor` and `interests` |

`interests` is always optional, but must be an array (max 10) when given.
Usernames are 3 to 20 letters, numbers or underscores, unique within a family.
PINs are exactly 4 digits. A username already taken in the family returns `409`.
A malformed `:id` returns `400`.

### Response data by role

`signup`, `login` and `/me` return the same user shape:

- **Parent**: `id`, `email`, `role`, `createdAt`, `familyCode`, `kids`
- **Kid**: `id`, `role`, `createdAt`, `username`, `name`, `parentId`, `kidId`
  (`/me` also includes the full `profile`)

### Game Endpoints

How it works: a kid taps "I did it" on a challenge, which creates a **pending**
completion. A parent then **approves** it (it counts toward XP, level, streak
and badges) or **rejects** it (the kid can try again). Each challenge can be
completed once.

The only stored game state is the `Completion` log. XP, level, streak, badges
and each challenge's status are recalculated from it on every read
(`src/game/rules.js`), so they can never drift out of sync.

| Method | Route | Role | Description |
|--------|-------|------|-------------|
| GET | `/api/game/me` | kid | The kid's adventure summary (404 if the account has no profile) |
| POST | `/api/game/me/challenges/:challengeId` | kid | Submit a challenge, optional `{ "note": "..." }` (max 280 chars) |
| GET | `/api/game/pending` | parent | Completions waiting for approval across the parent's kids, oldest first |
| GET | `/api/game/kids/:id` | parent | One of the parent's kids' adventure summary |
| POST | `/api/game/completions/:id/review` | parent | `{ "decision": "approve" \| "reject" }` |

Submitting returns `409` if the challenge is locked, already pending, or
already completed. Reviewing returns `409` if the completion was already
reviewed. Every endpoint except `/pending` returns the full summary:

```json
{
  "xp": 360, "level": 3, "levelXp": 300, "nextLevelXp": 600,
  "streak": { "current": 2, "best": 4 },
  "stats": { "completed": 7, "pending": 1, "badges": 3, "outdoorMinutes": 140 },
  "badges": [{ "id": "first-steps", "name": "First Steps", "earned": true, "earnedAt": "..." }],
  "regions": [{ "id": "backyard", "unlockLevel": 1, "unlocked": true,
    "completedCount": 5, "total": 5, "challenges": [{ "id": "backyard-bug-hunt", "status": "completed" }] }]
}
```

**Rules**
- **Levels:** reaching level *n* needs `50 * n * (n - 1)` XP in total (0, 100, 300, 600, ...).
- **Regions** unlock at levels 1, 2, 4, 6 and 8. The XP in the open regions is always enough to unlock the next.
- **Challenge status:** `completed`, then `locked`, then `pending`, otherwise `available`.
- **Streaks** count consecutive days with an approved challenge, by the day it was *submitted*, in `APP_TIMEZONE`. The current streak survives until the end of the next day.
- **Badges** cover challenge counts, streaks, each interest category, and clearing each region.

**Changing the catalogue:** challenge ids are stored in completions, so never
rename or reuse one. To retire a challenge, delete it from
`src/game/catalogue.js`; completions for unknown ids are ignored. Run
`npm test` after any change. It checks ids, icons, categories, and that every
region can be unlocked.

Kid lists and profiles (`GET /api/kids`, `/api/kids/:id`, `/api/kids/me`) also
include `points`, `level`, `stats: { challenges, badges, outdoorMinutes }` and
`pendingCount`. Deleting a kid deletes their completions.

### Health Check

```http
GET /health
```

**Response**:
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Data Model

### User

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | String | Parents | Unique email address (lowercase). Kids have none |
| password | String | Yes | Hashed password (min 6 chars), or a kid's hashed 4-digit PIN |
| role | String | Yes | `parent` (default) or `kid` |
| familyCode | String | Auto | Parent's 6-char code; kids store their parent's |
| parent | ObjectId | Kids | The kid's parent user |
| username | String | Kids | Login name, unique within the family |
| failedLogins, lockedUntil | Number, Date | No | Wrong-PIN count and lock (hidden from queries) |
| consent | Object | Parents | `policyVersion` and `acceptedAt` for the privacy policy |
| name | String | Kids | The kid's name |
| kidProfile | ObjectId | Kids | The kid's linked Kid profile |
| kids | Array | No | Kid profile IDs (parents) |
| createdAt | Date | Auto | Account creation timestamp |

### Kid

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | String | Yes | 2-50 characters |
| age | Number | Yes | 1-18 |
| avatarColor | String | Yes | Tailwind gradient classes (has a default) |
| interests | [String] | No | Up to 10 |
| parent | ObjectId | Yes | Owning parent user |
| account | ObjectId | No | The kid's login account, if the parent created one |
| consent | Object | New kids | `givenBy` (parent), `givenAt`, `policyVersion` |
| createdAt | Date | Auto | Creation timestamp |

### Migrating existing data

Kid accounts created before the `kidProfile`/`account` link existed can be
linked to their profiles (matched by parent and name) with:

```bash
npm run migrate:link-kids
```

**Kid logins without email.** Run this once before starting the new server
on an existing database. It replaces the old unique email index with one that
allows accounts without an email, adds the per-family username index, and lists
kid accounts that still have an email (their parents need to set a username
and PIN, which removes the email):

```bash
npm run migrate:kid-logins
```

### Privacy rules

- Kid accounts never store an email address, phone number or location.
- No kid photos on the server. Challenges that suggest a photo keep it on the
  device. Don't add photo, location or contact fields to `Completion`.
- Consent is recorded per parent and per kid with the policy version from
  `src/config/privacy.js`. Bump that version when `PRIVACY.md` changes.
- `PRIVACY.md` is a draft with placeholders. Have it reviewed before launch.

### Security Features

- Passwords are hashed using bcrypt (10 salt rounds)
- Password field is excluded from queries by default
- Email validation with regex
- Automatic email normalization (lowercase, trim)
- Password comparison method for login

## Authentication Flow

1. **Signup** (parents only): email, password and consent → Password is hashed → User saved to DB → JWT token generated and returned
2. **Login**: Parents use email and password; kids use family code, username and PIN (`/api/auth/kid-login`) → JWT token generated and returned
3. **Protected Routes**: Client sends JWT in `Authorization: Bearer <token>` header → Middleware verifies token → User attached to request → Route handler processes request

## Validation Rules

### Email
- Required for parents; kids have none
- Must be valid email format
- Automatically converted to lowercase
- Trimmed of whitespace

### Password and PIN
- Parents: required, minimum 6 characters
- Kids: exactly 4 digits, locked for 15 minutes after 5 wrong tries
- Both hashed before storage

### Role
- Signup only creates parents. Kid accounts are created by their parent

## Error Handling

All errors follow a consistent format:

```json
{
  "success": false,
  "message": "Error description here"
}
```

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (authentication failed)
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `500` - Internal Server Error

## Security Best Practices

✅ Passwords hashed with bcrypt (10 rounds)
✅ JWT tokens with expiration (7 days)
✅ Password field excluded from responses
✅ Input validation and sanitization
✅ Error messages don't leak sensitive info
✅ CORS enabled for controlled access
✅ Environment variables for secrets
✅ Email uniqueness enforced at DB level

### Additional Security Recommendations

- Use HTTPS in production
- Implement rate limiting on auth endpoints
- Add password strength requirements
- Enable email verification
- Implement refresh token mechanism
- Add request logging and monitoring
- Use helmet.js for HTTP headers security

## Testing

Run all tests:

```bash
npm test
```

The rules tests need no database. The API tests (`test/kidAccounts.test.js`,
`test/game.test.js`) send real requests to `src/app.js` backed by an in-memory
MongoDB from `mongodb-memory-server`, which downloads a MongoDB binary the
first time it runs.

### How a request flows

```
route -> auth / checkRole -> validate -> controller -> service -> models
                                                          \-> game/ (pure rules)
```

Services never touch `req` or `res`. When something goes wrong they throw an
error from `src/utils/errors.js` (for example `new NotFoundError('Kid not found')`),
and `src/middleware/errorHandler.js` turns it into the JSON response. Unexpected
errors are logged and returned as a plain 500 without internal details.

### Manual API testing

Use the included `test.http` file with the REST Client extension in VS Code:

1. Start the server: `npm run dev`
2. Open `test.http` in VS Code
3. Click "Send Request" above each endpoint
4. Copy the token from signup/login response
5. Update the `@token` variable at the top
6. Test protected endpoints

Or use curl:

```bash
# Signup
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","role":"parent"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Get Current User
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Database Setup

### Local MongoDB

```bash
# Install MongoDB
# macOS: brew install mongodb-community
# Ubuntu: sudo apt-get install mongodb
# Windows: Download from mongodb.com

# Start MongoDB
mongod
```

### MongoDB Atlas (Cloud)

1. Create account at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a cluster
3. Get connection string
4. Update `MONGODB_URI` in `.env`

## Development

```bash
# Install dependencies
npm install

# Run in development mode (auto-reload)
npm run dev

# Run in production mode
npm start
```

## Production Deployment

1. Set environment variables:
   - `MONGODB_URI` - Production database URL
   - `JWT_SECRET` - Strong random secret
   - `NODE_ENV=production`
   - `PORT` - Server port (default: 3000)

2. Use a process manager (PM2):
```bash
npm install -g pm2
pm2 start src/server.js --name touch-grass-api
```

3. Set up reverse proxy (Nginx):
```nginx
location /api {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}
```

## Troubleshooting

### MongoDB Connection Error
- Ensure MongoDB is running: `mongod`
- Check connection string in `.env`
- Verify network access (if using Atlas)

### JWT Token Invalid
- Verify `JWT_SECRET` matches across environments
- Check token expiration (default 7 days)
- Ensure `Bearer ` prefix in Authorization header

### CORS Errors
- Check CORS configuration in `server.js`
- Set `CORS_ORIGIN` in `.env` for specific origins

## Future Enhancements

- [ ] Email verification
- [ ] Password reset functionality
- [ ] Refresh token mechanism
- [ ] Rate limiting
- [ ] Admin role and permissions
- [ ] Two-factor authentication
- [ ] Password strength meter
- [ ] Account deletion
- [ ] Audit logging
- [ ] API documentation with Swagger

## License

ISC

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## Support

For issues and questions, please open an issue in the repository.

---

Built with ❤️ for the Touch Grass App
