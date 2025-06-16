# Swish 🏀
The basketball trading card platform

## Features

### Authentication & Security
- **Argon2id password hashing** with complexity requirements
- **Email verification** with secure token system
- **Password reset** with time-limited tokens
- **Security PIN** for additional protection
- **Rate limiting** and audit logging
- **International character support** (Japanese, Chinese, etc.)

### User Management
- **Extended profiles** with shipping addresses and payment methods
- **Collections system** with sharing and collaboration
- **Social features** - follow/unfollow users
- **Favorites & tracking** - track cards and price changes
- **Purchase history** with detailed transaction records

### Card System
- **Comprehensive card data** (player, team, year, brand, condition, rarity)
- **Collection management** with public/private visibility
- **Card favorites** and price tracking
- **Sale/trade status** management

### Search & Discovery
- **Omni search** with fuzzy matching across cards and users
- **Advanced filtering** by teams, players, brands, conditions, prices
- **Real-time autocomplete** with suggestions
- **Dynamic filter options** based on available data

### API Features
- **Standardized responses** with consistent error handling
- **Comprehensive validation** using Zod schemas
- **Audit logging** for security and compliance
- **Pagination** and sorting across all endpoints
- **Role-based access control** (USER, SELLER, ADMIN)

## Tech Stack
- **Next.js 14** with App Router
- **TypeScript** for type safety
- **PostgreSQL** database
- **Prisma ORM** for database management
- **Zod** for validation
- **Argon2** for password hashing

## Getting Started

### Prerequisites
- Node.js 18+ and pnpm
- PostgreSQL database

### Local Development Setup

1. **Clone and install dependencies**
   ```bash
   git clone <repository-url>
   cd swish
   pnpm install
   ```

2. **Database setup**
   ```bash
   # Copy .env.example to .env and edit the strings
   cp .env.example .env
   
   # Run migrations
   npx prisma migrate dev
   
   # Generate Prisma client
   npx prisma generate
   ```

3. **Start development server**
   ```bash
   pnpm dev
   ```

4. **Run tests**
   ```bash
   pnpm test
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Password reset
- `POST /api/auth/change-password` - Change password

### Users
- `GET /api/users/me` - Current user profile
- `PATCH /api/users/me` - Update current user
- `GET /api/users/[userId]/profile` - Extended user profile
- `PATCH /api/users/[userId]/profile` - Update extended profile
- `POST /api/users/[userId]/security-pin` - Set security PIN

### Collections
- `GET /api/users/[userId]/collections` - List user collections
- `POST /api/users/[userId]/collections` - Create collection
- `GET /api/users/[userId]/collections/[id]` - Get collection
- `PATCH /api/users/[userId]/collections/[id]` - Update collection
- `DELETE /api/users/[userId]/collections/[id]` - Delete collection

### Social Features
- `GET /api/users/[userId]/followers` - Get followers
- `POST /api/users/[userId]/followers` - Follow user
- `DELETE /api/users/[userId]/followers` - Unfollow user
- `GET /api/users/[userId]/favorites` - Get favorite cards
- `POST /api/users/[userId]/favorites` - Add favorite card
- `GET /api/users/[userId]/purchases` - Purchase history

### Search
- `GET /api/search` - Main search with filters
- `GET /api/search/quick` - Quick search/autocomplete
- `GET /api/search/filters` - Available filter options

### Cards
- `GET /api/cards` - List cards with filtering
- `POST /api/cards` - Create card
- `GET /api/cards/[id]` - Get card details
- `PATCH /api/cards/[id]` - Update card
- `DELETE /api/cards/[id]` - Delete card

### Health
- `GET /api/health` - API health check
- `GET /api/health/db` - Database health check

## Database Schema

### Core Models
- **User** - Extended profiles with social features
- **Card** - Basketball cards with comprehensive metadata
- **Collection** - User-created card collections
- **UserFollow** - Social following relationships
- **CardFavorite** - User favorite cards
- **CardTracking** - Price tracking and notifications
- **Purchase** - Transaction history

## Security Features
- **Military-grade encryption** with Argon2id
- **Comprehensive rate limiting** on all endpoints
- **Request size validation** to prevent DoS attacks
- **Audit logging** for all user actions
- **Input sanitization** and validation
- **CORS protection** and security headers

## Development

### Running Tests
```bash
pnpm test          # Run all tests
pnpm test:watch    # Run tests in watch mode
```

### Database Management
```bash
npx prisma studio          # Open database browser
npx prisma migrate dev      # Create new migration
npx prisma db push          # Push schema changes
npx prisma generate         # Regenerate client
```

## FAQ

### I'm getting an error when running `pnpm prisma migrate dev`

#### ERROR: permission denied to create database
```
Error: P3014

Prisma Migrate could not create the shadow database. Please make sure the database user has permission to create databases. Read more about the shadow database (and workarounds) at https://pris.ly/d/migrate-shadow

Original error: 
ERROR: permission denied to create database
   0: schema_core::state::DevDiagnostic
             at schema-engine/core/src/state.rs:281
```

In your PostgreSQL's Docker exec window, type the following in:

```
ALTER USER <user_here> CREATEDB;
```

#### ERROR: permission denied for schema public

In your PostgreSQL's Docker exec window, type the following in:

```
\c <your database> postgres
GRANT ALL PRIVILEGES ON SCHEMA public TO <your user>
```

### How do I generate a JWT secret?

You'll need to generate a 32-bit random string. The easiest way to do it is through Node.js:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Or through openssl:

```bash
openssl rand -hex 32
```

This will give you a 32-bit string which you can put into your .env.