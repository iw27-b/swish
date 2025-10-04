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
- `access_token` - 15 minute expiry, HttpOnly, Secure, SameSite=None (production) / SameSite=Lax (development)
- `refresh_token` - 7 day expiry, HttpOnly, Secure, SameSite=None (production) / SameSite=Lax (development)
- `csrf_token` - 15 minute expiry, JavaScript-readable, Secure, SameSite=None (production) / SameSite=Lax (development)

**User Profile Data:** To retrieve user profile information, use the authenticated `GET /api/users/me` endpoint. User data is NOT exposed via cookies for security reasons.

**CSRF Protection:** All state-changing requests (POST, PUT, PATCH, DELETE) require a valid CSRF token in the `X-CSRF-Token` header that matches the `csrf_token` cookie. The CSRF token is issued during login and token refresh.

**CORS Support:** All authentication endpoints support cross-origin requests with credentials from trusted origins only. The client must:
1. Include `credentials: 'include'` in fetch requests
2. Send the `X-CSRF-Token` header with the token value from the response body or cookie for all state-changing requests
3. Originate from an allowed origin (localhost:3000, localhost:3001, or production domain)

---

## Authentication Endpoints

### POST `/api/auth/login`
**Description:** User login with secure cookie authentication and CSRF token issuance

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
    "loginSuccess": true,
    "csrfToken": "a1b2c3d4e5f6..."
  },
  "message": "Login successful"
}
```

Sets secure HttpOnly cookies for authentication and a JavaScript-readable CSRF token cookie. The CSRF token is also returned in the response body for client-side storage.

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

### POST `/api/auth/refresh`
**Description:** Refresh access token using HttpOnly refresh token cookie
**Authentication:** Requires valid refresh token cookie

**Request Body:** None (uses refresh token from cookie)

**Response:**
```json
{
  "success": true,
  "data": {
    "csrfToken": "a1b2c3d4e5f6..."
  },
  "message": "Token refreshed successfully"
}
```

**Features:**
- Automatically sets new access token and CSRF token cookies
- Returns new CSRF token in response body
- Supports CORS with credentials for cross-origin requests from trusted origins only
- Uses proper SameSite cookie attributes (none for production, lax for development)
- Includes proper CORS headers for preflight requests

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

### Cards Listing Page: `/cards`
**Description:** Frontend page that displays basketball trading cards with advanced filtering and search capabilities. Integrates CategoryFilter component for dynamic filtering and CardGrid component for card display.

**Features:**
- **Real-time Filtering:** Filter by players, seasons/years, and organizations
- **Pagination:** Navigate through multiple pages of cards
- **Responsive Grid Layout:** Card display with hover effects and like functionality
- **Search Integration:** Connected to `/api/cards` endpoint with query parameters
- **Loading States:** Proper loading indicators and error handling
- **Card Details:** Click-through to individual card pages

**Filter Mapping:**
- Players filter → `player` query parameter
- Seasons filter → `year` query parameter  
- Organizations filter → Custom organization-based filtering
- Pagination → `page` and `pageSize` query parameters

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

### DELETE `/api/cards/[cardId]`
**Description:** Delete a specific card and its associated image
**Authentication:** Required (Owner or Admin only)

**Parameters:**
- `cardId` (URL parameter): Card ID

**Response (Success):**
```json
{
  "success": true,
  "message": "Card deleted successfully"
}
```

**Response (Partial Success - Card deleted but image cleanup failed):**
```json
{
  "success": false,
  "message": "Card deleted but image cleanup failed. Image may require manual cleanup.",
  "data": {
    "cardDeleted": true,
    "imageDeleted": false,
    "orphanedImageUrl": "https://example.com/image.jpg"
  }
}
```
**Status Code:** 207 (Multi-Status)

**Notes:**
- Implements retry logic with exponential backoff for image deletion
- Logs structured error events for observability on image cleanup failures
- Returns partial success status when card deletion succeeds but image cleanup fails

### GET `/api/cards/recommended`
**Description:** Get today's recommended cards (4 random cards that refresh daily)
**Authentication:** Not required

**Response:**
```json
{
  "success": true,
  "data": {
    "recommendations": [
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
        "imageUrl": "https://...",
        "owner": {
          "id": "owner_id",
          "name": "Card Owner",
          "email": "owner@example.com"
        }
      }
    ]
  },
  "message": "Daily recommended cards retrieved successfully"
}
```

**Features:**
- Returns 4 randomly selected cards that are available for sale
- Uses deterministic randomization based on current date for consistency throughout the day
- Cards refresh automatically at midnight or when the application restarts
- In-memory caching for optimal performance
- Only recommends cards that are marked as `isForSale: true`

---

## Search

### GET `/api/search/quick`
**Description:** Quick search for autocomplete suggestions
**Authentication:** Required for user searches; Optional for card/general suggestions

**Security Features:**
- Authentication required for `type=users` searches
- Minimum query length of 3 characters for user-related searches
- Stricter rate limits applied to user searches (auth rate limits)
- User suggestions only returned to authenticated users

**Query Parameters:**
- `query` (string): Search term (minimum 3 characters for user searches)
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

**Error Responses:**
- `401` - Authentication required for user searches
- `400` - Query too short for user searches (< 3 characters)
- `429` - Rate limit exceeded

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

## Image Management

### POST `/api/images/upload`
**Description:** Upload an image for cards, collections, or profile
**Authentication:** Required

**Request Body (multipart/form-data):**
- `file` - Image file (JPEG, PNG, WebP, GIF, max 10MB)
- `alt` - Alt text for accessibility (optional)
- `category` - Image category (defined by ImageCategorySchema: card, profile, or collection; default: "card")

**Response:**
```json
{
  "success": true,
  "data": {
    "url": "/api/images/serve/abc123.jpg",
    "filename": "abc123.jpg",
    "hash": "sha256hash",
    "metadata": {
      "originalFilename": "card.jpg",
      "size": 1024000,
      "type": "image/jpeg",
      "alt": "Basketball card image",
      "category": "card",
      "uploadedAt": "2024-01-01T00:00:00.000Z"
    }
  },
  "message": "Image uploaded successfully"
}
```

### DELETE `/api/images/delete`
**Description:** Delete one or more images with authorization checks
**Authentication:** Required
**Authorization:** Must be image owner OR admin role
**Security:** Only accepts server-internal image paths (must start with `/api/images/serve/`)

**Single Image Delete:**
```json
{
  "imageUrl": "/api/images/serve/abc123.jpg"
}
```

**Note:** External URLs (starting with `http`) are no longer accepted for security reasons. Only server-internal relative paths are permitted.

**Bulk Image Delete:**
```json
{
  "imageUrls": [
    "/api/images/serve/abc123.jpg",
    "/api/images/serve/def456.png"
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "deletedUrls": ["/api/images/serve/abc123.jpg"],
    "failedUrls": [],
    "summary": {
      "total": 1,
      "deleted": 1,
      "failed": 0
    }
  },
  "message": "All images deleted successfully"
}
```

**Authorization Rules:**
- Users can only delete images they own (card images, collection images, profile images)
- Admin users can delete any image
- Authorization is checked by looking up image ownership in cards, collections, and user profiles
- Unauthorized attempts are logged and return 403 Forbidden

### GET `/api/images/serve/[filename]`
**Description:** Serve uploaded images
**Authentication:** Not required

**Response:** Image file with optimized headers

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

- **CSRF Protection** - Double-submit cookie pattern with server-side validation for all state-changing requests
- **Strict CORS** - Origin validation restricting state-changing endpoints to trusted origins only
- **Argon2id password hashing** - Industry-leading password security
- **Audit logging** - All security events tracked
- **PIN protection** - Additional security for sensitive operations
- **Input validation** - Comprehensive request validation
- **Request size limits** - Protection against oversized payloads
- **Secure cookies** - HttpOnly, Secure, SameSite cookies with appropriate scope