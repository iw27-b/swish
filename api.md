# Swish Basketball Trading Card Platform - API Documentation

## Overview
This document provides a comprehensive overview of all API endpoints in the Swish basketball trading card platform. All routes use standardized response formats for consistency.

## Standard Response Format

### Success Response
```json
{
  "success": true,
  "data": {...},
  "message": "Success message"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "details": {...}  // Optional validation errors
}
```

## Authentication
Most routes require authentication via HttpOnly cookies set during login:
- `access_token` - 15 minute expiry
- `refresh_token` - 7 day expiry  
- `user_data` - Non-sensitive user info for client

---

## Authentication Endpoints

### POST `/api/auth/login`
**Description:** User login with secure cookie authentication

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "loginSuccess": true
  },
  "message": "Login successful"
}
```

Sets secure HttpOnly cookies for authentication.

### POST `/api/auth/register`
**Description:** Create new user account

**Request Body:**
```json
{
  "email": "user@example.com", 
  "password": "securePassword123!",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "USER",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "emailVerified": false
    }
  },
  "message": "User created successfully"
}
```

### POST `/api/auth/logout`
**Description:** Clear authentication cookies and logout
**Authentication:** Required

**Request Body:** None

**Response:**
```json
{
  "success": true,
  "data": null,
  "message": "Logged out successfully"
}
```

### POST `/api/auth/change-password`
**Description:** Change user password (requires PIN if set)
**Authentication:** Required

**Request Body:**
```json
{
  "currentPassword": "oldPassword",
  "newPassword": "newSecurePassword123!",
  "pin": "1234"  // Optional, required if user has PIN set
}
```

**Response:**
```json
{
  "success": true,
  "data": null,
  "message": "Password changed successfully"
}
```

### POST `/api/auth/forgot-password`
**Description:** Request password reset link

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "data": null,
  "message": "If an account with that email exists, we have sent a password reset link."
}
```

### POST `/api/auth/reset-password`
**Description:** Complete password reset using token

**Request Body:**
```json
{
  "token": "reset_token_from_email",
  "password": "newSecurePassword123!"
}
```

**Response:**
```json
{
  "success": true,
  "data": null,
  "message": "Password reset successfully. You can now log in with your new password."
}
```

### GET `/api/auth/verify_email/[token]`
**Description:** Verify user email address using token

**Parameters:**
- `token` (URL parameter): Email verification token

**Response:**
```json
{
  "success": true,
  "data": null,
  "message": "Email verified successfully"
}
```

---

## Health Monitoring

### GET `/api/health`
**Description:** Application health check

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "uptime": 12345.67,
    "environment": "development",
    "version": "1.0.0"
  },
  "message": "Service is healthy"
}
```

### GET `/api/health/db`
**Description:** Database connectivity health check

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "responseTime": "45ms",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "database": "connected"
  },
  "message": "Database is healthy"
}
```

---

## User Management

### GET `/api/users`
**Description:** List all users (Admin only)
**Authentication:** Required (Admin role)

**Query Parameters:**
- `page` (number, default: 1): Page number
- `pageSize` (number, default: 20): Items per page
- `search` (string): Search by name
- `role` (string): Filter by role (USER/ADMIN)
- `emailVerified` (boolean): Filter by email verification status
- `sortBy` (string, default: 'createdAt'): Sort field
- `sortOrder` (string, default: 'desc'): Sort direction (asc/desc)

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "user_id",
        "name": "John Doe",
        "role": "USER",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "emailVerified": true,
        "twoFactorEnabled": false
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 100,
      "pageSize": 20
    }
  },
  "message": "Users retrieved successfully"
}
```

### GET `/api/users/me`
**Description:** Get current user's complete profile
**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "USER",
    "emailVerified": true,
    "phoneNumber": "+1234567890",
    "bio": "Basketball card collector",
    "hasSecurityPin": true
  },
  "message": "Complete profile retrieved successfully"
}
```

### PATCH `/api/users/me`
**Description:** Update current user's profile (PIN required for sensitive fields)
**Authentication:** Required

**Request Body:**
```json
{
  "name": "Updated Name",
  "email": "newemail@example.com",  // Requires PIN if user has one
  "phoneNumber": "+1234567890",     // Requires PIN if user has one
  "bio": "Updated bio",             // Requires PIN if user has one
  "shippingAddress": {...},         // Always requires PIN
  "securityPin": "1234"             // Required for sensitive/financial fields
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": { /* updated user object */ }
  },
  "message": "Profile updated successfully"
}
```

### GET `/api/users/[userId]`
**Description:** Get specific user profile
**Authentication:** Required

**Parameters:**
- `userId` (URL parameter): Target user ID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user_id",
    "name": "John Doe",
    "role": "USER",
    "profileImageUrl": "https://...",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "User profile retrieved successfully"
}
```

### GET `/api/users/[userId]/followers`
**Description:** Get user's followers list
**Authentication:** Required

**Parameters:**
- `userId` (URL parameter): Target user ID

**Query Parameters:**
- `page`, `pageSize`: Pagination options

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "follower_id",
        "name": "Follower Name",
        "profileImageUrl": "https://..."
      }
    ],
    "pagination": { /* pagination info */ }
  },
  "message": "Followers retrieved successfully"
}
```

### GET `/api/users/[userId]/favorites`
**Description:** Get user's favorite cards
**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "card_id",
        "name": "Card Name",
        "player": "Player Name",
        "imageUrl": "https://..."
      }
    ]
  },
  "message": "Favorites retrieved successfully"
}
```

---

## Basketball Cards

### GET `/api/cards`
**Description:** List basketball trading cards with filtering and pagination

**Query Parameters:**
- `page`, `pageSize`: Pagination
- `search`: General search term
- `player`: Filter by player name
- `team`: Filter by team name  
- `brand`: Filter by card brand
- `year`: Filter by card year
- `condition`: Filter by card condition
- `rarity`: Filter by card rarity
- `isForTrade`, `isForSale`: Filter availability
- `minPrice`, `maxPrice`: Price range filters
- `sortBy`, `sortOrder`: Sorting options

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "card_id",
        "name": "1998 Upper Deck Michael Jordan",
        "player": "Michael Jordan",
        "team": "Chicago Bulls",
        "year": 1998,
        "brand": "Upper Deck",
        "condition": "MINT",
        "rarity": "RARE",
        "price": 199.99,
        "isForTrade": true,
        "isForSale": true,
        "owner": {
          "id": "owner_id",
          "name": "Card Owner"
        }
      }
    ],
    "pagination": { /* pagination info */ }
  },
  "message": "Cards retrieved successfully"
}
```

### POST `/api/cards`
**Description:** Create new card listing
**Authentication:** Required

**Request Body:**
```json
{
  "name": "1998 Upper Deck Michael Jordan",
  "player": "Michael Jordan",
  "team": "Chicago Bulls",
  "year": 1998,
  "brand": "Upper Deck",
  "cardNumber": "#23",
  "condition": "MINT",
  "rarity": "RARE",
  "description": "Excellent condition card",
  "imageUrl": "https://...",
  "isForTrade": true,
  "isForSale": true,
  "price": 199.99
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "card": { /* created card object */ }
  },
  "message": "Card created successfully"
}
```

### GET `/api/cards/[cardId]`
**Description:** Get specific card details

**Parameters:**
- `cardId` (URL parameter): Card ID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "card_id",
    "name": "1998 Upper Deck Michael Jordan",
    "player": "Michael Jordan",
    /* full card details */
  },
  "message": "Card retrieved successfully"
}
```

---

## Search

### GET `/api/search/quick`
**Description:** Quick search for autocomplete suggestions
**Authentication:** Required

**Query Parameters:**
- `query` (string): Search term
- `limit` (number, default: 10): Max suggestions
- `type` (string): Search type ('cards', 'users', 'suggestions', 'all')

**Response:**
```json
{
  "success": true,
  "data": {
    "suggestions": [
      {
        "text": "Michael Jordan - Chicago Bulls",
        "type": "card",
        "imageUrl": "https://..."
      },
      {
        "text": "John Collector",
        "type": "user",
        "count": 150
      }
    ]
  },
  "message": "Quick search completed successfully"
}
```

### GET `/api/search/filters`
**Description:** Get available filter options for advanced search

**Response:**
```json
{
  "success": true,
  "data": {
    "teams": ["Chicago Bulls", "Lakers", ...],
    "brands": ["Upper Deck", "Topps", ...],
    "conditions": ["MINT", "NEAR_MINT", ...],
    "rarities": ["COMMON", "RARE", ...]
  },
  "message": "Filter options retrieved successfully"
}
```

---

## Trading System

### GET `/api/trades`
**Description:** Get user's trades with filtering
**Authentication:** Required

**Query Parameters:**
- `page`, `pageSize`: Pagination
- `status`: Filter by trade status ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED')
- `type`: Filter by trade type ('sent', 'received', 'all')
- `sortBy`, `sortOrder`: Sorting options

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "trade_id",
        "status": "PENDING",
        "message": "Trade message",
        "expiresAt": "2024-01-07T00:00:00.000Z",
        "initiator": {
          "id": "user_id",
          "name": "Trade Initiator"
        },
        "recipient": {
          "id": "user_id", 
          "name": "Trade Recipient"
        },
        "cards": [
          {
            "isOffered": true,
            "card": { /* card details */ }
          }
        ]
      }
    ],
    "pagination": { /* pagination info */ }
  },
  "message": "Trades retrieved successfully"
}
```

### POST `/api/trades`
**Description:** Create new trade offer
**Authentication:** Required

**Request Body:**
```json
{
  "offeredCardIds": ["card_id_1", "card_id_2"],
  "requestedCardIds": ["card_id_3", "card_id_4"],
  "recipientUserId": "recipient_user_id",
  "message": "Trade offer message",
  "expiresInDays": 7
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "trade": { /* created trade object */ }
  },
  "message": "Trade offer created successfully"
}
```

### GET `/api/trades/[tradeId]`
**Description:** Get specific trade details
**Authentication:** Required

**Parameters:**
- `tradeId` (URL parameter): Trade ID

**Response:**
```json
{
  "success": true,
  "data": {
    /* full trade details */
  },
  "message": "Trade retrieved successfully"
}
```

---

## Collections

### GET `/api/collections`
**Description:** List card collections with filtering
**Authentication:** Required

**Query Parameters:**
- `page`, `pageSize`: Pagination
- `search`: Search collection names
- `isPublic`: Filter by privacy setting
- `sortBy`, `sortOrder`: Sorting options

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "collection_id",
        "name": "My Jordan Collection",
        "description": "Collection description",
        "isPublic": true,
        "owner": {
          "id": "owner_id",
          "name": "Collection Owner"
        },
        "_count": {
          "cards": 25
        }
      }
    ],
    "pagination": { /* pagination info */ }
  },
  "message": "Collections retrieved successfully"
}
```

### POST `/api/collections`
**Description:** Create new card collection
**Authentication:** Required

**Request Body:**
```json
{
  "name": "My Jordan Collection",
  "description": "All my Michael Jordan cards",
  "isPublic": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "collection": { /* created collection object */ }
  },
  "message": "Collection created successfully"
}
```

---

## Marketplace

### GET `/api/marketplace`
**Description:** Browse marketplace listings with filtering

**Query Parameters:**
- `page`, `pageSize`: Pagination
- `search`: Search listings
- `minPrice`, `maxPrice`: Price filters
- `condition`: Filter by card condition
- `sortBy`, `sortOrder`: Sorting options

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "listing_id",
        "price": 199.99,
        "condition": "MINT",
        "card": { /* card details */ },
        "seller": {
          "id": "seller_id",
          "name": "Seller Name"
        }
      }
    ],
    "pagination": { /* pagination info */ }
  },
  "message": "Marketplace listings retrieved successfully"
}
```

---

## Purchases

### GET `/api/purchases`
**Description:** Get user's purchase history
**Authentication:** Required

**Query Parameters:**
- `page`, `pageSize`: Pagination
- `status`: Filter by purchase status
- `sortBy`, `sortOrder`: Sorting options

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "purchase_id",
        "amount": 199.99,
        "status": "COMPLETED",
        "purchasedAt": "2024-01-01T00:00:00.000Z",
        "card": { /* purchased card details */ },
        "seller": {
          "id": "seller_id",
          "name": "Seller Name"
        }
      }
    ],
    "pagination": { /* pagination info */ }
  },
  "message": "Purchase history retrieved successfully"
}
```

---

## Error Codes

| Status Code | Description |
|-------------|-------------|
| 400 | Bad Request - Invalid input data |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 409 | Conflict - Resource already exists |
| 413 | Payload Too Large - Request size exceeded |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Server error |
| 503 | Service Unavailable - Service unhealthy |

---

## Rate Limiting

The API implements rate limiting on the following operations:
- **Authentication routes**: 5 attempts per 15 minutes per IP
- **Search operations**: 100 requests per minute per user  
- **Trade creation**: 10 trades per hour per user
- **Collection operations**: 20 requests per minute per user

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Request limit
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Reset timestamp

---

## Security Features

- **Argon2id password hashing** - Industry-leading password security
- **Audit logging** - All security events tracked
- **PIN protection** - Additional security for sensitive operations
- **Input validation** - Comprehensive request validation
- **Request size limits** - Protection against oversized payloads
- **CORS protection** - Cross-origin request security
- **Secure cookies** - HttpOnly, Secure, SameSite cookies