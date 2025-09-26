import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import prisma from '@/lib/prisma';
import { AuthenticatedRequest } from '@/types';
import { UpdateCardSchema, UpdateCardRequestBody } from '@/types/schemas/card_schemas';
import {
  createSuccessResponse,
  createErrorResponse,
  getClientIP,
  getUserAgent,
  logAuditEvent,
  validateRequestSize,
  retryWithBackoff,
  logObservabilityError,
} from '@/lib/api_utils';
import { validateImageFile } from '@/lib/image_utils';
import { verifyAuth, isRateLimited, recordFailedAttempt } from '@/lib/auth';
import { Role } from '@prisma/client';

/**
 * GET /api/cards/[cardId]
 * 获取卡片详情（无需认证）
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { cardId: string } }
) {
  try {
    const { cardId } = params;

    if (!cardId) {
      return createErrorResponse('Card ID is required', 400);
    }

    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { favorites: true, tracking: true },
        },
      },
    });

    if (!card) {
      return createErrorResponse('Card not found', 404);
    }

    logAuditEvent({
      action: 'CARD_VIEWED',
      ip: getClientIP(req.headers),
      userAgent: getUserAgent(req.headers),
      resource: 'card',
      resourceId: cardId,
      timestamp: new Date(),
    });

    return createSuccessResponse(card, 'Card retrieved successfully');
  } catch (error) {
    console.error('Get card error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

/**
 * PATCH /api/cards/[cardId]
 * 更新卡片（需要认证，必须是本人或管理员）
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { cardId: string } }
) {
  try {
    const clientIP = getClientIP(req.headers);

    if (isRateLimited(clientIP)) {
      logAuditEvent({
        action: 'CARD_UPDATE_RATE_LIMITED',
        ip: clientIP,
        userAgent: getUserAgent(req.headers),
        resource: 'card',
        timestamp: new Date(),
      });
      return createErrorResponse('Too many update attempts. Please try again later.', 429);
    }

    const authResult = await verifyAuth(req);
    if (!authResult.success || !authResult.user) {
      recordFailedAttempt(clientIP);
      return createErrorResponse('Authentication required', 401);
    }

    const { cardId } = params;
    const { userId, role } = authResult.user;

    if (!cardId) {
      recordFailedAttempt(clientIP);
      return createErrorResponse('Card ID is required', 400);
    }

    let updateData: Partial<UpdateCardRequestBody>;
    let imageFile: File | null = null;

    const contentType = req.headers.get('content-type');

    if (contentType?.includes('multipart/form-data')) {
      const formData = await req.formData();
      updateData = {
        name: formData.get('name') as string,
        player: formData.get('player') as string,
        team: formData.get('team') as string,
        year: formData.get('year') ? parseInt(formData.get('year') as string) : undefined,
        brand: formData.get('brand') as string,
        cardNumber: formData.get('cardNumber') as string,
        condition: formData.get('condition') as any,
        rarity: formData.get('rarity') as any,
        description: formData.get('description') as string,
        isForTrade: formData.get('isForTrade') === 'true',
        isForSale: formData.get('isForSale') === 'true',
        price: formData.get('price') ? parseFloat(formData.get('price') as string) : undefined,
      };
      imageFile = formData.get('file') as File;
    } else {
      updateData = await req.json();
    }

    if (!validateRequestSize(updateData)) {
      recordFailedAttempt(clientIP);
      return createErrorResponse('Request too large', 413);
    }

    const existingCard = await prisma.card.findUnique({
      where: { id: cardId },
      select: { id: true, ownerId: true, name: true, imageUrl: true },
    });

    if (!existingCard) {
      recordFailedAttempt(clientIP);
      return createErrorResponse('Card not found', 404);
    }

    if (existingCard.ownerId !== userId && role !== Role.ADMIN) {
      logAuditEvent({
        action: 'UNAUTHORIZED_CARD_UPDATE_ATTEMPT',
        userId,
        ip: clientIP,
        userAgent: getUserAgent(req.headers),
        resource: 'card',
        resourceId: cardId,
        timestamp: new Date(),
      });
      return createErrorResponse('Forbidden: You can only update your own cards', 403);
    }

    // 图片上传
    if (imageFile && imageFile.size > 0) {
      try {
        const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
        const validationResult = validateImageFile(imageBuffer);

        if (!validationResult.isValid) {
          recordFailedAttempt(clientIP);
          return createErrorResponse(validationResult.error || 'Invalid image file', 400);
        }

        const formData = new FormData();
        formData.append('file', imageFile);
        formData.append('category', 'card');

        if (!process.env.NEXT_PUBLIC_BASE_URL) {
          throw new Error('NEXT_PUBLIC_BASE_URL is not configured');
        }

        const uploadResponse = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/images/upload`,
          {
            method: 'POST',
            body: formData,
            headers: {
              Authorization: req.headers.get('Authorization') || '',
              Cookie: req.headers.get('Cookie') || '',
            },
          }
        );

        if (!uploadResponse.ok) {
          throw new Error('Image upload failed');
        }

        const uploadResult = await uploadResponse.json();
        updateData.imageUrl = uploadResult.data.url;
      } catch (imageError) {
        return createErrorResponse(
          `Image upload failed: ${
            imageError instanceof Error ? imageError.message : 'Unknown error'
          }`,
          400
        );
      }
    }

    const validationResult = UpdateCardSchema.safeParse(updateData);
    if (!validationResult.success) {
      recordFailedAttempt(clientIP);
      return createErrorResponse(
        'Invalid request data',
        400,
        validationResult.error.flatten().fieldErrors
      );
    }

    const validatedUpdateData = validationResult.data as UpdateCardRequestBody;

    if (validatedUpdateData.isForSale === true && validatedUpdateData.price === undefined) {
      recordFailedAttempt(clientIP);
      return createErrorResponse('Price is required when listing card for sale', 400);
    }

    const updatedCard = await prisma.card.update({
      where: { id: cardId },
      data: validatedUpdateData,
      include: {
        owner: { select: { id: true, name: true, email: true } },
      },
    });

    logAuditEvent({
      action: 'CARD_UPDATED',
      userId,
      ip: clientIP,
      userAgent: getUserAgent(req.headers),
      resource: 'card',
      resourceId: cardId,
      timestamp: new Date(),
      details: { updatedFields: Object.keys(validatedUpdateData) },
    });

    return createSuccessResponse(updatedCard, 'Card updated successfully');
  } catch (error) {
    console.error('Update card error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

/**
 * DELETE /api/cards/[cardId]
 * 删除卡片（需要认证，必须是本人或管理员）
 */
export async function DELETE(
  req: AuthenticatedRequest,
  { params }: { params: { cardId: string } }
) {
  try {
    if (!req.user) {
      return createErrorResponse('Authentication required', 401);
    }

    const { cardId } = params;
    const { userId, role } = req.user;

    if (!cardId) {
      return createErrorResponse('Card ID is required', 400);
    }

    const existingCard = await prisma.card.findUnique({
      where: { id: cardId },
      select: {
        id: true,
        ownerId: true,
        name: true,
        imageUrl: true,
        isForSale: true,
        isForTrade: true,
      },
    });

    if (!existingCard) {
      return createErrorResponse('Card not found', 404);
    }

    if (existingCard.ownerId !== userId && role !== Role.ADMIN) {
      logAuditEvent({
        action: 'UNAUTHORIZED_CARD_DELETE_ATTEMPT',
        userId,
        ip: getClientIP(req.headers),
        userAgent: getUserAgent(req.headers),
        resource: 'card',
        resourceId: cardId,
        timestamp: new Date(),
      });
      return createErrorResponse('Forbidden: You can only delete your own cards', 403);
    }

    await prisma.card.delete({ where: { id: cardId } });

    logAuditEvent({
      action: 'CARD_DELETED',
      userId,
      ip: getClientIP(req.headers),
      userAgent: getUserAgent(req.headers),
      resource: 'card',
      resourceId: cardId,
      timestamp: new Date(),
      details: { cardName: existingCard.name },
    });

    return createSuccessResponse({ id: cardId }, 'Card deleted successfully');
  } catch (error) {
    console.error('Delete card error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}
