import { NextResponse, NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth_utils';
import { hasPermission } from '@/lib/rbac';
import { Role } from '@prisma/client';
import { AuthenticatedRequest, JwtPayload } from '@/types';

const protectedPaths: string[] = [
    '/api/users',
    '/api/auth/send_verification_email',
    '/api/auth/logout',
    '/api/auth/change-password',
    '/api/cards',
    '/api/trades',
    '/api/collections',
];

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
        req.user = decodedPayload;

    let resource = '';
    let action = '';

    if (path.startsWith('/api/users')) {
            resource = 'profile';
            const isSpecificUserPath = path.split('/').length > 3;
      
      if (method === 'GET') {
                action = isSpecificUserPath ? 'read:own' : 'list:any';
                if (decodedPayload.role === Role.ADMIN && isSpecificUserPath) action = 'read:any';
      }
            if (method === 'PATCH') action = 'update:own';
            if (method === 'DELETE') action = 'delete:any';
    
            if (resource === 'profile' && action === 'list:any' && decodedPayload.role === Role.ADMIN) {
                resource = 'users';
         action = 'manage:any';
      } 
    } else if (path.startsWith('/api/auth/send_verification_email')) {
      resource = 'auth';
            action = 'request:emailVerification';
        } else if (path.startsWith('/api/auth/logout')) {
            resource = 'auth';
            action = 'logout';
        } else if (path.startsWith('/api/auth/change-password')) {
            resource = 'auth';
            action = 'change:password';
        } else if (path.startsWith('/api/cards')) {
            if (method === 'GET') {
                resource = 'cards';
                action = 'read:own';
            } else if (method === 'POST') {
                resource = 'cards';
                action = 'create:own';
            } else if (method === 'PATCH' || method === 'DELETE') {
                resource = 'cards';
                action = method === 'PATCH' ? 'update:own' : 'delete:own';
            }
        } else if (path.startsWith('/api/trades')) {
            resource = 'trades';
            if (method === 'GET') action = 'read:own';
            if (method === 'POST') action = 'create:own';
            if (method === 'PATCH') action = 'update:own';
            if (method === 'DELETE') action = 'delete:own';
        } else if (path.startsWith('/api/collections')) {
            resource = 'collections';
            if (method === 'GET') action = 'read:own';
            if (method === 'POST') action = 'create:own';
            if (method === 'PATCH') action = 'update:own';
            if (method === 'DELETE') action = 'delete:own';
        }

    if (resource && action) {
      if (!hasPermission(decodedPayload.role, resource, action, req, decodedPayload)) {
        let message = 'Forbidden: You do not have permission to perform this action.';
        if (action.includes(':own') && resource === 'profile') {
            message = 'Forbidden: You can only perform this action on your own profile.';
        }
                if ((action.includes(':any') || action === 'delete:any') && decodedPayload.role !== Role.ADMIN) {
            message = 'Forbidden: Admin access required.';
        }
        return NextResponse.json({ message }, { status: 403 });
      }
    } else if (path.startsWith('/api/')) {
        console.warn(`Unmapped protected route: ${method} ${path}`);
        return NextResponse.json({ message: 'Forbidden: Permission check not configured for this route.' }, { status: 403 });
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/users/:path*',
    '/api/auth/send_verification_email',
        '/api/auth/logout',
        '/api/auth/change-password',
        '/api/cards/:path*',
        '/api/trades/:path*',
        '/api/collections/:path*',
  ],
}; 