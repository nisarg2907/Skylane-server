# Skylane Flight Booking System - Backend

## Project Overview
Skylane Backend is a robust NestJS-based server application for managing flight bookings, user authentication, and related services.

## Technology Stack
- NestJS
- TypeScript
- Prisma ORM
- PostgreSQL (Supabase)
- Nodemailer
- Supabase Authentication

## Key Services
1. **Authentication Service**
   - User authentication and token verification
   - Sync authenticated users with database
   - Protected routes

2. **User Service**
   - Profile management
   - Update user details
   - Manage payment methods

3. **Flight Service**
   - Advanced flight search
   - One-way and round-trip flight filtering
   - Comprehensive search criteria support

4. **Booking Service**
   - Booking creation
   - Booking updates
   - Booking cancellations
   - Retrieve user booking details

5. **Ticket Service**
   - E-ticket generation
   - Ticket management
   - Email ticket distribution
   - Supabase storage integration

6. **Email Service**
   - User notifications
   - Ticket email dispatches
   - Uses Nodemailer

7. **SSE (Server-Sent Events) Service**
   - Real-time flight seat updates
   - Broadcast seat availability changes

8. **Encryption Service**
   - Secure user card information
   - Encrypt/decrypt sensitive data

## Prerequisites
- Node.js (v18+)
- npm
- PostgreSQL (Supabase)

## Installation

### Clone the Repository
```bash
git clone git@github.com:nisarg2907/Skylane-server.git
cd Skylane-server
```

### Install Dependencies
```bash
npm install
```

### Environment Configuration
Create a `.env` file with the following variables:
```
# Database Configuration
DATABASE_URL=your_postgresql_connection_string
DIRECT_URL=your_direct_database_connection_string

# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key

# Server Configuration
CLIENT_URL=http://localhost:5173
PORT=3001

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=true
EMAIL_USER=your_email
EMAIL_PASSWORD=your_email_password
EMAIL_FROM=your_email
EMAIL_FROM_NAME=Skylane Flights

# Security
ENCRYPTION_KEY=your_encryption_key
```

### Database Setup
```bash
# Generate Prisma Client
npx prisma generate

# Run Database Migrations
npx prisma migrate deploy

# Seed Database (Optional)
npm run seed
```

## Running the Application

### Development Mode
```bash
npm run start:dev
```

### Production Mode
```bash
npm run build
npm run start:prod
```

```

## Deployment
- Deployed on Render
- GitHub Repository: https://github.com/nisarg2907/Skylane-server


## Security Features
- JWT Authentication
- Route Protection
- Data Encryption
- Secure Environment Configuration

## Performance Optimizations
- Prisma ORM for efficient database queries
- Optimized database connections

## Logging and Monitoring
- Built-in NestJS logging
- Error tracking

