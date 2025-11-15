# Touch Grass API - Authentication Backend

A production-ready Node.js Express API with MongoDB for user authentication, built for the Touch Grass application.

## Features

- User registration and login
- JWT-based authentication
- Password hashing with bcrypt
- Role-based access (Parent/Kid)
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
│   │   └── User.js              # User model with password hashing
│   ├── routes/
│   │   └── auth.js              # Authentication routes
│   ├── controllers/
│   │   └── authController.js   # Auth business logic
│   ├── middleware/
│   │   └── auth.js              # JWT verification middleware
│   ├── config/
│   │   └── db.js                # MongoDB connection
│   └── server.js                # Express app & server setup
├── .env                         # Environment variables
├── .gitignore                   # Git ignore rules
├── package.json                 # Dependencies & scripts
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
```

**Important**: Change `JWT_SECRET` to a strong random string in production.

## API Endpoints

### Base URL
```
http://localhost:3000
```

### Authentication Endpoints

#### 1. Signup (Register)
Create a new user account.

```http
POST /api/auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "role": "parent"  // optional: "parent" (default) or "kid"
}
```

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
- `400` - Validation error (missing fields, weak password)
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

## User Model

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | String | Yes | Unique email address (lowercase) |
| password | String | Yes | Hashed password (min 6 chars) |
| role | String | Yes | User role: "parent" or "kid" (default: "parent") |
| kids | Array | No | Array of Kid IDs (for parent accounts) |
| createdAt | Date | Auto | Account creation timestamp |

### Security Features

- Passwords are hashed using bcrypt (10 salt rounds)
- Password field is excluded from queries by default
- Email validation with regex
- Automatic email normalization (lowercase, trim)
- Password comparison method for login

## Authentication Flow

1. **Signup**: User provides email, password, and role → Password is hashed → User saved to DB → JWT token generated and returned
2. **Login**: User provides credentials → Password verified → JWT token generated and returned
3. **Protected Routes**: Client sends JWT in `Authorization: Bearer <token>` header → Middleware verifies token → User attached to request → Route handler processes request

## Validation Rules

### Email
- Required
- Must be valid email format
- Automatically converted to lowercase
- Trimmed of whitespace

### Password
- Required
- Minimum 6 characters
- Hashed before storage

### Role
- Optional (defaults to "parent")
- Must be either "parent" or "kid"

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
