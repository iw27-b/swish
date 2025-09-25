import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { createSuccessResponse, createErrorResponse, getClientIP, getUserAgent, logAuditEvent } from '@/lib/api_utils';

let cachedRecommendations: any[] | null = null;
let lastCacheDate: string | null = null;

/**
 * Generates daily recommended cards by selecting 4 random cards from the database.
 * Uses a deterministic seed based on the current date to ensure consistency throughout the day.
 * 
 * @returns Array of 4 randomly selected card IDs
 */
async function generateDailyRecommendations(): Promise<string[]> {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    const availableCards = await prisma.card.findMany({
        where: {
            isForSale: true,
        },
        select: {
            id: true,
        },
        orderBy: {
            id: 'asc', // Consistent ordering
        }
    });

    if (availableCards.length === 0) {
        return [];
    }

    const seed = parseInt(today.replace(/-/g, '')) % 1000000;
    const maxCards = Math.min(4, availableCards.length);
    const selectedCards: string[] = [];
    
    for (let i = 0; i < maxCards; i++) {
        const index = (seed + i * 7) % availableCards.length;
        selectedCards.push(availableCards[index].id);
    }

    return selectedCards;
}

/**
 * Handles GET requests to retrieve today's recommended cards.
 * Returns 4 randomly selected cards that refresh daily or on app restart.
 * 
 * @param req NextRequest - The incoming request object
 * @returns JSON response with recommended card IDs
 */
export async function GET(req: NextRequest) {
    try {
        const today = new Date().toISOString().split('T')[0];
        
        if (!cachedRecommendations || lastCacheDate !== today) {
            const recommendedCardIds = await generateDailyRecommendations();
            
            if (recommendedCardIds.length === 0) {
                cachedRecommendations = [];
                lastCacheDate = today;
                return createSuccessResponse(
                    { recommendations: [] },
                    'No cards available for recommendation'
                );
            }

            const recommendedCards = await prisma.card.findMany({
                where: {
                    id: { in: recommendedCardIds },
                },
                include: {
                    owner: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        }
                    }
                }
            });

            // Update cache
            cachedRecommendations = recommendedCards;
            lastCacheDate = today;
        }

        logAuditEvent({
            action: 'RECOMMENDED_CARDS_REQUESTED',
            ip: getClientIP(req.headers),
            userAgent: getUserAgent(req.headers),
            resource: 'cards',
            timestamp: new Date(),
            details: {
                cacheDate: lastCacheDate,
                recommendationCount: cachedRecommendations.length,
            },
        });

        return createSuccessResponse(
            { recommendations: cachedRecommendations },
            'Daily recommended cards retrieved successfully'
        );

    } catch (error) {
        console.error('Get recommended cards error:', error);
        return createErrorResponse('Internal server error', 500);
    }
}
