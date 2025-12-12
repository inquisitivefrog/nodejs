# Mobile App Server - MEN Stack with React Admin Dashboard

## Project Overview

A full-stack mobile application server built with the MEN stack (MongoDB, Express.js, Node.js) featuring:

- **Backend API**: Express.js server providing RESTful endpoints for mobile applications
- **Database**: MongoDB for flexible, scalable data storage
- **Authentication**: JWT-based authentication using Passport.js
- **Admin Dashboard**: React-based web interface for administration and monitoring
- **Containerization**: Docker Compose for easy deployment and development

## Architecture

```
┌─────────────────┐
│  Mobile Apps    │
│  (iOS/Android)  │
└────────┬────────┘
         │ HTTP/HTTPS
         │ JWT Tokens
┌────────▼─────────────────────────┐
│     Express.js API Server        │
│     (Node.js + Passport.js)      │
└────────┬─────────────────────────┘
         │
         │
┌────────▼────────┐
│    MongoDB      │
└─────────────────┘

┌─────────────────┐
│ React Admin     │
│ Dashboard       │
└────────┬────────┘
         │ HTTP/HTTPS
         │ JWT Tokens
         │
┌────────▼─────────────────────────┐
│     Express.js API Server        │
│     (Same Backend)               │
└──────────────────────────────────┘
```

## Technology Stack

### Backend
- **Node.js**: JavaScript runtime
- **Express.js**: Web application framework
- **MongoDB**: NoSQL database (3-node replica set)
- **Mongoose**: MongoDB object modeling
- **Passport.js**: Authentication middleware
- **jsonwebtoken**: JWT token generation and verification
- **bcrypt**: Password hashing
- **dotenv**: Environment variable management
- **Redis**: Caching and rate limiting
- **BullMQ**: Job queue system
- **Multer**: File upload handling
- **Sharp**: Image processing
- **Winston**: Structured logging
- **Swagger/OpenAPI**: API documentation
- **express-rate-limit**: Rate limiting middleware

### Frontend (Admin Dashboard)
- **React**: UI library
- **React Router**: Client-side routing
- **Axios**: HTTP client for API calls
- **Modern CSS/UI Framework**: For responsive design

### DevOps
- **Docker**: Containerization
- **Docker Compose**: Multi-container orchestration

## Project Structure

```
mobile-app/
├── server/                 # Backend Express.js application
│   ├── src/
│   │   ├── config/        # Configuration files
│   │   ├── controllers/   # Route controllers
│   │   ├── middleware/    # Custom middleware (auth, validation)
│   │   ├── models/        # Mongoose models
│   │   ├── routes/        # API routes
│   │   ├── utils/         # Utility functions
│   │   └── app.js         # Express app setup
│   ├── Dockerfile
│   └── package.json
├── admin-dashboard/        # React admin dashboard
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API service functions
│   │   ├── utils/         # Utilities (auth, helpers)
│   │   └── App.js         # Main App component
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml      # Docker Compose configuration
├── README.md              # This file
└── PROGRESS.md            # Development progress tracking
```

## Features

### Authentication
- User registration and login
- JWT token-based authentication (access tokens + refresh tokens)
- Protected API routes
- Admin role-based access control
- Password hashing with bcrypt
- Account activation/deactivation
- Password reset functionality
- Email verification
- Refresh token rotation

### Security Features (Priority 1)
- Refresh token mechanism with rotation
- Password reset with secure tokens
- Email verification
- Rate limiting (IP-based and user-based)
- Input sanitization (XSS protection)
- CORS configuration with environment-specific origins

### API Improvements (Priority 2)
- **Rate Limiting**: Redis-backed distributed rate limiting
  - General API: 100 requests per 15 minutes
  - Auth endpoints: 5 requests per 15 minutes
  - Password reset: 3 requests per hour
  - User operations: 200 requests per 15 minutes
- **API Versioning**: `/api/v1/` prefix with backward compatibility
- **Pagination & Filtering**: 
  - Pagination with `?page=1&limit=10`
  - Sorting with `?sort=createdAt&order=desc`
  - Filtering by role, isActive, email, name
  - Maximum 100 items per page
- **Input Validation**: Enhanced validation with sanitization

### Features & Functionality (Priority 3)
- **File Upload Service**: 
  - Profile picture upload (`POST /api/v1/upload/profile-picture`)
  - Image processing and optimization (Sharp)
  - File validation (image types, 5MB max)
  - Local filesystem storage (S3-ready structure)
- **API Documentation**: 
  - Swagger/OpenAPI 3.0 documentation
  - Interactive API testing interface at `/api/docs`
  - Auto-generated from JSDoc annotations
- **Logging System**: 
  - Winston structured logging
  - Request/response logging with request IDs
  - Log rotation (daily, 14-30 day retention)
  - Separate error and combined log files
- **CORS Configuration**: 
  - Environment-specific allowed origins
  - Credentials support
  - Configurable via environment variables

### Testing
- Comprehensive test suite (290+ tests)
- Unit tests for controllers and middleware
- Integration tests for API endpoints
- Performance and load testing
- 84.83% code coverage

### API Endpoints

#### Versioned Endpoints (Recommended)
- `/api/v1/auth/register` - User registration
- `/api/v1/auth/login` - User login
- `/api/v1/auth/refresh` - Refresh access token
- `/api/v1/auth/me` - Get current user (protected)
- `/api/v1/auth/forgot-password` - Request password reset
- `/api/v1/auth/reset-password` - Reset password with token
- `/api/v1/auth/verify-email` - Verify email address
- `/api/v1/auth/resend-verification` - Resend verification email
- `/api/v1/users` - Get all users (admin, paginated)
- `/api/v1/users/:id` - Get user by ID (admin)
- `/api/v1/users/:id` - Update user (admin, PUT)
- `/api/v1/users/:id` - Delete user (admin, DELETE)
- `/api/v1/admin/pools` - Get connection pool statistics (admin)
- `/api/v1/upload/profile-picture` - Upload profile picture (POST, multipart/form-data)
- `/api/v1/upload/profile-picture` - Delete profile picture (DELETE)
- `/api/docs` - Interactive API documentation (Swagger UI)
- `/api/docs.json` - OpenAPI specification (JSON)

#### Legacy Endpoints (Backward Compatible)
- `/api/auth/*` - Same as `/api/v1/auth/*`
- `/api/users/*` - Same as `/api/v1/users/*`
- `/api/admin/*` - Same as `/api/v1/admin/*`

### Admin Dashboard
- User management interface
- Authentication and authorization
- Dashboard analytics (to be implemented)
- Real-time data visualization

## Getting Started

### Prerequisites
- Docker and Docker Compose installed
- Node.js 20+ (for local development)
- npm or yarn

### Quick Start

1. **Clone and navigate to the project:**
   ```bash
   cd apps/mobile-app
   ```

2. **Start all services with Docker Compose:**
   ```bash
   docker-compose up -d
   ```

3. **Create an admin user:**
   ```bash
   docker-compose exec server npm run create-admin
   ```

4. **Access the application:**
   - Admin Dashboard: http://localhost
   - API Server: http://localhost:3000
   - API Health Check: http://localhost:3000/health
   - API Documentation: http://localhost:3000/api/docs
   - MongoDB: localhost:27017

5. **Login to Admin Dashboard:**
   - Email: `admin@example.com`
   - Password: `admin123`
   - ⚠️ **Change the password after first login!**

### Running with Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f server

# Stop all services
docker-compose down

# Stop and remove volumes (clears database)
docker-compose down -v
```

### Creating Initial Admin User

After starting the services, create an admin user:

```bash
# Using Docker
docker compose exec server npm run create-admin

# Or locally (if running server locally)
cd server
npm run create-admin
```

Default admin credentials:
- Email: `admin@example.com`
- Password: `admin123`

**⚠️ Important: Change the admin password after first login!**

### Debug Service

A debug service is available for MongoDB CLI and API testing:

```bash
# Access the debug container
docker compose exec debug sh

# Connect to MongoDB
mongosh mongodb://mongodb:27017/mobileapp

# Test API with curl
curl http://server:3000/health
```

See [debug/README.md](./debug/README.md) for more examples.

### MongoDB Sharding (Learning/Development)

For learning MongoDB sharding, a complete sharded cluster setup is available:

```bash
# Start sharded cluster
docker compose -f docker-compose.sharding.yml up -d

# Initialize sharding (one-time setup)
docker compose -f docker-compose.sharding.yml --profile sharding up mongodb-sharding-init
```

**Architecture:**
- 3 Config Servers (metadata)
- 2 Shards (each a 3-node replica set)
- 2 mongos Routers (query routers)

**Connection:** Applications connect to mongos routers, not shards directly.

See [SHARDING_QUICKSTART.md](./SHARDING_QUICKSTART.md) for quick start guide and [docs/MONGODB_SHARDING.md](./docs/MONGODB_SHARDING.md) for detailed documentation.

### AWS Deployment

For AWS deployment with availability zones, see [docs/AWS_DEPLOYMENT.md](./docs/AWS_DEPLOYMENT.md).

**Key Points:**
- ✅ **Self-managed MongoDB works perfectly with AWS availability zones**
- ✅ **No need to replace with 3rd party service** (unless you want managed service benefits)
- ✅ **MongoDB Atlas** is an option if you want fully managed MongoDB (handles backups, monitoring, scaling automatically)

**When to use Atlas vs Self-Managed:**
- **Atlas**: Operational simplicity, automatic backups, compliance, global clusters
- **Self-Managed**: Full control, cost optimization at large scale, learning

### Local Development

#### Backend
```bash
cd server
npm install
npm run dev
```

#### Frontend
```bash
cd admin-dashboard
npm install
npm start
```

## Environment Variables

### Docker Compose
Environment variables can be set in a `.env` file in the root directory. Docker Compose will automatically load it.

**⚠️ Important**: Never commit `.env` files to git. Use `.env.example` as a template.

Create a `.env` file:
```env
JWT_SECRET=your-super-secret-key-change-this-in-production
JWT_EXPIRES_IN=24h
NODE_ENV=production
```

Generate a secure JWT secret:
```bash
openssl rand -base64 32
```

See [SECURITY.md](./SECURITY.md) for more security best practices.

### Local Development

#### Backend (server/.env)
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/mobileapp
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=24h
NODE_ENV=development
```

#### Frontend (admin-dashboard/.env)
```env
REACT_APP_API_URL=http://localhost:3000/api
```

## API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}

Response:
{
  "message": "Login successful",
  "token": "jwt-token-here",
  "user": {
    "id": "user-id",
    "email": "john@example.com",
    "name": "John Doe",
    "role": "user"
  }
}
```

#### Get Current User (Protected)
```http
GET /api/auth/me
Authorization: Bearer <jwt-token>
```

### User Management Endpoints (Admin Only)

#### Get All Users
```http
GET /api/users
Authorization: Bearer <admin-jwt-token>
```

#### Get User by ID
```http
GET /api/users/:id
Authorization: Bearer <admin-jwt-token>
```

#### Update User
```http
PUT /api/users/:id
Authorization: Bearer <admin-jwt-token>
Content-Type: application/json

{
  "name": "Updated Name",
  "role": "admin",
  "isActive": true
}
```

#### Delete User
```http
DELETE /api/users/:id
Authorization: Bearer <admin-jwt-token>
```

#### Upload Profile Picture
```http
POST /api/v1/upload/profile-picture
Authorization: Bearer <jwt-token>
Content-Type: multipart/form-data

profilePicture: <image file>
```

#### Delete Profile Picture
```http
DELETE /api/v1/upload/profile-picture
Authorization: Bearer <jwt-token>
```

### Health Check
```http
GET /health
```

### API Documentation
```http
GET /api/docs
```
Interactive Swagger UI for testing all API endpoints.

## Testing

The backend includes a comprehensive test suite with **102 tests** covering all aspects of the application.

### Running Tests

```bash
# From Docker container
docker compose exec server npm test

# Or locally
cd server
npm test              # Run all tests (102 tests)
npm run test:unit     # Run unit tests only (29 tests)
npm run test:performance # Run performance tests only (15 tests)
npm run test:coverage # Run tests with coverage report
npm run test:watch    # Run tests in watch mode
```

### Test Coverage

**Overall Coverage**: 84.83% statements, 80.61% branches, 85.71% functions, 85.36% lines

**Coverage by Module**:
- **Models**: 100% coverage ✅
- **Middleware**: 94.44% coverage ✅
- **Controllers**: 91.11% coverage ✅
- **Routes**: 84.74% coverage ✅
- **Config**: 69.09% coverage

### Test Suites

#### Integration Tests (58 tests)
- User Management API (12 tests)
- Authentication API (13 tests)
- User Model (9 tests)
- Health Check (1 test)
- Error Handler Middleware (13 tests)
- Passport JWT Strategy (7 tests)
- Database Connection (4 tests)

#### Performance Tests (15 tests)
- API Performance Benchmarks (13 tests)
  - Response time benchmarks
  - Concurrent request handling
  - Database query performance
  - Authentication performance
- Load Testing (3 tests)
  - Sustained load (50 sequential requests)
  - Burst testing (20 concurrent requests)
  - Mixed read/write workloads

#### Unit Tests (29 tests)
- Auth Controller (10 tests)
- Auth Middleware (7 tests)
- Error Handler Middleware (14 tests)

### Test Structure

```
server/
├── tests/
│   ├── unit/              # Unit tests (isolated components)
│   │   ├── controllers/
│   │   └── middleware/
│   ├── performance/       # Performance and load tests
│   ├── helpers/           # Test utilities
│   ├── setup.js           # Test environment setup
│   ├── auth.test.js       # Authentication integration tests
│   ├── users.test.js      # User management integration tests
│   └── models/            # Model tests
└── jest.config.js         # Jest configuration
```

All tests run with proper database connection cleanup, ensuring Jest exits cleanly without requiring `--forceExit`.

## Development Status

See [PROGRESS.md](./PROGRESS.md) for detailed development progress.

## License

ISC

