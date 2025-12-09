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
- **MongoDB**: NoSQL database
- **Mongoose**: MongoDB object modeling
- **Passport.js**: Authentication middleware
- **jsonwebtoken**: JWT token generation and verification
- **bcrypt**: Password hashing
- **dotenv**: Environment variable management

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
- JWT token-based authentication
- Protected API routes
- Token refresh mechanism
- Password hashing with bcrypt

### API Endpoints
- `/api/auth/register` - User registration
- `/api/auth/login` - User login
- `/api/auth/me` - Get current user (protected)
- Additional mobile app endpoints (to be defined)

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

### Health Check
```http
GET /health
```

## Testing

The backend includes comprehensive test suites:

```bash
cd server
npm test              # Run all tests
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
```

Test coverage includes:
- Authentication endpoints (register, login, get current user)
- User management endpoints (admin only)
- User model validation and password hashing
- Protected routes and authorization
- Error handling

See [server/README.md](./server/README.md) for more details.

## Development Status

See [PROGRESS.md](./PROGRESS.md) for detailed development progress.

## License

ISC

