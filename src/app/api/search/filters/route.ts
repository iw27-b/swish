import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { AuthenticatedRequest } from '@/types';
import { createSuccessResponse, createErrorResponse, getClientIP, getUserAgent, logAuditEvent } from '@/lib/api_utils';
import { CardCondition, CardRarity, Role } from '@prisma/client';

/**
 * Get available filter options for search
 * @param req AuthenticatedRequest - The authenticated request
 * @returns JSON response with filter options or error
 */
export async function GET(req: AuthenticatedRequest) {
    try {
        if (!req.user) {
            return createErrorResponse('Authentication required', 401);
        }

        const requestingUser = req.user;

        const [
            teams,
            players,
            brands,
            years,
            priceRange,
            cardCounts,
            userCounts
        ] = await Promise.all([
            // Get unique teams with counts
            prisma.card.groupBy({
                by: ['team'],
                _count: { team: true },
                orderBy: { _count: { team: 'desc' } },
                take: 50
            }),
            
            // Get unique players with counts
            prisma.card.groupBy({
                by: ['player'],
                _count: { player: true },
                orderBy: { _count: { player: 'desc' } },
                take: 100
            }),
            
            // Get unique brands with counts
            prisma.card.groupBy({
                by: ['brand'],
                _count: { brand: true },
                orderBy: { _count: { brand: 'desc' } },
                take: 30
            }),
            
            // Get unique years with counts
            prisma.card.groupBy({
                by: ['year'],
                _count: { year: true },
                orderBy: { year: 'desc' },
                take: 50
            }),
            
            // Get price range
            prisma.card.aggregate({
                _min: { price: true },
                _max: { price: true },
                _avg: { price: true },
                where: { price: { not: null } }
            }),
            
            // Get card condition and rarity counts
            Promise.all([
                prisma.card.groupBy({
                    by: ['condition'],
                    _count: { condition: true }
                }),
                prisma.card.groupBy({
                    by: ['rarity'],
                    _count: { rarity: true }
                })
            ]),
            
            // Get user role and verification counts
            Promise.all([
                prisma.user.groupBy({
                    by: ['role'],
                    _count: { role: true }
                }),
                prisma.user.groupBy({
                    by: ['emailVerified'],
                    _count: { emailVerified: true }
                }),
                prisma.user.groupBy({
                    by: ['isSeller'],
                    _count: { isSeller: true }
                }),
                prisma.user.groupBy({
                    by: ['languagePreference'],
                    _count: { languagePreference: true }
                })
            ])
        ]);

        const [conditionCounts, rarityCounts] = cardCounts;
        const [roleCounts, emailVerifiedCounts, sellerCounts, languageCounts] = userCounts;

        // Calculate follower ranges
        const followerStats = await prisma.$queryRaw<Array<{min: number, max: number, avg: number}>>`
            SELECT 
                MIN(follower_count) as min,
                MAX(follower_count) as max,
                AVG(follower_count) as avg
            FROM (
                SELECT COUNT(*) as follower_count
                FROM "UserFollow"
                GROUP BY "followingId"
            ) follower_counts
        `;

        const filterOptions = {
            // Card filters
            cardFilters: {
                teams: teams.map(t => ({
                    value: t.team,
                    count: t._count.team
                })),
                players: players.map(p => ({
                    value: p.player,
                    count: p._count.player
                })),
                brands: brands.map(b => ({
                    value: b.brand,
                    count: b._count.brand
                })),
                years: years.map(y => ({
                    value: y.year,
                    count: y._count.year
                })),
                conditions: Object.values(CardCondition).map(condition => ({
                    value: condition,
                    count: conditionCounts.find(c => c.condition === condition)?._count.condition || 0
                })),
                rarities: Object.values(CardRarity).map(rarity => ({
                    value: rarity,
                    count: rarityCounts.find(r => r.rarity === rarity)?._count.rarity || 0
                })),
                priceRange: {
                    min: priceRange._min.price || 0,
                    max: priceRange._max.price || 1000,
                    average: Math.round((priceRange._avg.price || 0) * 100) / 100
                }
            },
            
            userFilters: {
                roles: Object.values(Role).map(role => ({
                    value: role,
                    count: roleCounts.find(r => r.role === role)?._count.role || 0
                })),
                emailVerified: [
                    {
                        value: true,
                        count: emailVerifiedCounts.find(e => e.emailVerified === true)?._count.emailVerified || 0
                    },
                    {
                        value: false,
                        count: emailVerifiedCounts.find(e => e.emailVerified === false)?._count.emailVerified || 0
                    }
                ],
                isSeller: [
                    {
                        value: true,
                        count: sellerCounts.find(s => s.isSeller === true)?._count.isSeller || 0
                    },
                    {
                        value: false,
                        count: sellerCounts.find(s => s.isSeller === false)?._count.isSeller || 0
                    }
                ],
                languages: languageCounts
                    .filter(l => l.languagePreference !== null)
                    .map(l => ({
                        value: l.languagePreference!,
                        count: l._count.languagePreference
                    })),
                followerRange: {
                    min: followerStats[0]?.min || 0,
                    max: followerStats[0]?.max || 100,
                    average: Math.round((followerStats[0]?.avg || 0) * 100) / 100
                }
            },
            
            statistics: {
                totalCards: await prisma.card.count(),
                totalUsers: await prisma.user.count({ where: { emailVerified: true } }),
                totalCollections: await prisma.collection.count(),
                cardsForSale: await prisma.card.count({ where: { isForSale: true } }),
                cardsForTrade: await prisma.card.count({ where: { isForTrade: true } })
            }
        };

        logAuditEvent({
            action: 'SEARCH_FILTERS_VIEWED',
            userId: requestingUser.userId,
            ip: getClientIP(req.headers),
            userAgent: getUserAgent(req.headers),
            resource: 'search',
            timestamp: new Date(),
        });

        return createSuccessResponse(filterOptions, 'Filter options retrieved successfully');

    } catch (error) {
        console.error('Get search filters error:', error);
        return createErrorResponse('Internal server error', 500);
    }
} 