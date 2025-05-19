import { NextResponse, NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth_utils';
import { hasPermission } from '@/lib/rbac';
import { Role } from '@prisma/client';
import { AuthenticatedRequest, JwtPayload } from '@/types';

const protectedPaths: string[] = [
  '/api/users', // Protect all routes under /api/users
  '/api/auth/send_verification_email', // Protect this route
  // Add other paths that need authentication
];

// We might not need adminPaths separately if RBAC handles it based on resource/action
// const adminPaths: string[] = []; 

export async function middleware(req: AuthenticatedRequest) {
  const path = req.nextUrl.pathname;
  const method = req.method;

  const isProtected = protectedPaths.some(p => path.startsWith(p));

  if (isProtected) {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')?.[1];

    if (!token) {
      return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
    }

    const decodedPayload: JwtPayload | null = verifyToken(token);
    if (!decodedPayload) {
      return NextResponse.json({ message: 'Invalid or expired token' }, { status: 401 });
    }
    req.user = decodedPayload; // Attach user payload

    // Determine resource and action based on path and method
    let resource = '';
    let action = '';

    if (path.startsWith('/api/users')) {
      resource = 'profile'; // Or 'users' for more general user management by admins
      const isSpecificUserPath = path.split('/').length > 3; // e.g., /api/users/[id]
      
      if (method === 'GET') {
        action = isSpecificUserPath ? 'read:own' : 'list:any'; // read:own will be checked by condition
        if (decodedPayload.role === Role.ADMIN && isSpecificUserPath) action = 'read:any'; // Admin override for specific user GET
      }
      if (method === 'PATCH') action = 'update:own'; // update:own will be checked by condition
      if (method === 'DELETE') action = 'delete:any'; // This implies admin only in rbac.ts
    
      // For admin-specific general user management (e.g. listing all users if we implement /api/users)
      if (resource === 'profile' && action === 'list:any' && decodedPayload.role === Role.ADMIN){
         resource = 'users'; // more general
         action = 'manage:any';
      } 
    } else if (path.startsWith('/api/auth/send_verification_email')) {
      resource = 'auth';
      action = 'request:emailVerification'; // A new specific action
    }
    // Add more resource/action mappings for other services like listings, orders etc.

    if (resource && action) {
      if (!hasPermission(decodedPayload.role, resource, action, req, decodedPayload)) {
        let message = 'Forbidden: You do not have permission to perform this action.';
        // Customize messages based on action/resource if needed
        if (action.includes(':own') && resource === 'profile') {
            message = 'Forbidden: You can only perform this action on your own profile.';
        }
        if ((action.includes(':any') || action === 'delete:any') && decodedPayload.role !== Role.ADMIN){
            message = 'Forbidden: Admin access required.';
        }
        return NextResponse.json({ message }, { status: 403 });
      }
    } else if (path.startsWith('/api/')) {
        // Fallback for unmapped protected API routes - should be mapped for clarity
        console.warn(`Unmapped protected route: ${method} ${path}`);
        return NextResponse.json({ message: 'Forbidden: Permission check not configured for this route.' }, { status: 403 });
    }
  }
  return NextResponse.next();
}

// Matcher to specify which routes the middleware should run on
export const config = {
  matcher: [
    '/api/users/:path*',
    '/api/auth/send_verification_email',
    // '/api/admin/:path*', // Add when admin routes are defined
    // '/api/listings/:path*', // Example for future
    // Add other API paths that need protection
  ],
}; 