# Swish 🏀
The basketball trading card platform

## Tech Stack
- **Next.js 15** with App Router
- **TypeScript** for type safety
- **PostgreSQL** database
- **Prisma ORM** for database management
- **Zod** for validation
- **Argon2** for password hashing

## Getting Started

### Prerequisites
- Node.js 20+ and pnpm
- PostgreSQL database

### Local Development Setup

1. **Clone and install dependencies**
   ```bash
   git clone https://github.com/iw27-b/swish
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

Please see `api.md`

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