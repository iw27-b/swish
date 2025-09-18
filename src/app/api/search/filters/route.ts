import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { createSuccessResponse, createErrorResponse, getClientIP, getUserAgent, logAuditEvent } from '@/lib/api_utils';
import { CardCondition, CardRarity, Role } from '@prisma/client';

/**
 * Get available filter options for search
 * @param req NextRequest - The request (public endpoint)
 * @returns JSON response with filter options or error
 */
export async function GET(req: NextRequest) {
    try {

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

        // Helper function to convert BigInt to number
        const toNumber = (value: any): number => {
            return typeof value === 'bigint' ? Number(value) : value;
        };

        const filterOptions = {
            // Card filters
            cardFilters: {
                teams: teams.map(t => ({
                    value: t.team,
                    count: toNumber(t._count.team)
                })),
                players: players.map(p => ({
                    value: p.player,
                    count: toNumber(p._count.player)
                })),
                brands: brands.map(b => ({
                    value: b.brand,
                    count: toNumber(b._count.brand)
                })),
                years: years.map(y => ({
                    value: y.year,
                    count: toNumber(y._count.year)
                })),
                conditions: Object.values(CardCondition).map(condition => ({
                    value: condition,
                    count: toNumber(conditionCounts.find(c => c.condition === condition)?._count.condition || 0)
                })),
                rarities: Object.values(CardRarity).map(rarity => ({
                    value: rarity,
                    count: toNumber(rarityCounts.find(r => r.rarity === rarity)?._count.rarity || 0)
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
                    count: toNumber(roleCounts.find(r => r.role === role)?._count.role || 0)
                })),
                emailVerified: [
                    {
                        value: true,
                        count: toNumber(emailVerifiedCounts.find(e => e.emailVerified === true)?._count.emailVerified || 0)
                    },
                    {
                        value: false,
                        count: toNumber(emailVerifiedCounts.find(e => e.emailVerified === false)?._count.emailVerified || 0)
                    }
                ],
                isSeller: [
                    {
                        value: true,
                        count: toNumber(sellerCounts.find(s => s.isSeller === true)?._count.isSeller || 0)
                    },
                    {
                        value: false,
                        count: toNumber(sellerCounts.find(s => s.isSeller === false)?._count.isSeller || 0)
                    }
                ],
                languages: languageCounts
                    .filter(l => l.languagePreference !== null)
                    .map(l => ({
                        value: l.languagePreference!,
                        count: toNumber(l._count.languagePreference)
                    })),
                followerRange: {
                    min: toNumber(followerStats[0]?.min || 0),
                    max: toNumber(followerStats[0]?.max || 100),
                    average: Math.round((toNumber(followerStats[0]?.avg) || 0) * 100) / 100
                }
            },
            
            statistics: {
                totalCards: toNumber(await prisma.card.count()),
                totalUsers: toNumber(await prisma.user.count({ where: { emailVerified: true } })),
                totalCollections: toNumber(await prisma.collection.count()),
                cardsForSale: toNumber(await prisma.card.count({ where: { isForSale: true } })),
                cardsForTrade: toNumber(await prisma.card.count({ where: { isForTrade: true } }))
            }
        };

        logAuditEvent({
            action: 'SEARCH_FILTERS_VIEWED',
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