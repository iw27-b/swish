import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth';
import { createSuccessResponse, createErrorResponse } from '@/lib/api_utils';
import { addToCart } from '@/lib/cart_actions';

// OBSOLETE -- use /api/cart instead