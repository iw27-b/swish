import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { DeepMockProxy } from 'vitest-mock-extended';
import { PrismaClient, CardCondition, CardRarity, Role } from '@prisma/client';

import { GET as quickSearchGet } from '@/app/api/search/quick/route';
import { GET as searchFiltersGet } from '@/app/api/search/filters/route';
import prisma from '@/lib/prisma';
import * as authUtils from '@/lib/auth_utils';

vi.mock('@/lib/auth_utils', () => ({
    isRateLimitedForOperation: vi.fn(),
    recordAttemptForOperation: vi.fn(),
}));

const prismaMock = prisma as unknown as DeepMockProxy<typeof prisma>;

const mockAuthenticatedRequest = (url: string, user?: any): NextRequest => {
    const request = new NextRequest(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });
    
    (request as any).user = user || {
        userId: 'user-123',
        role: Role.USER,
        email: 'test@example.com'
    };
    
    return request;
};

const mockUnauthenticatedRequest = (url: string): NextRequest => {
    return new NextRequest(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });
};

describe('Search Endpoints', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (authUtils.isRateLimitedForOperation as any).mockReturnValue(false);
        (authUtils.recordAttemptForOperation as any).mockReturnValue(undefined);
    });

    describe('GET /api/search/quick', () => {
        it('should require authentication', async () => {
            const request = mockUnauthenticatedRequest('http://localhost:3000/api/search/quick?query=test');
            const response = await quickSearchGet(request);
            const data = await response.json();

            expect(response.status).toBe(401);
            expect(data.success).toBe(false);
            expect(data.message).toBe('Authentication required');
        });

        it('should return 429 when rate limited', async () => {
            (authUtils.isRateLimitedForOperation as any).mockReturnValue(true);
            
            const request = mockAuthenticatedRequest('http://localhost:3000/api/search/quick?query=test');
            const response = await quickSearchGet(request);
            const data = await response.json();

            expect(response.status).toBe(429);
            expect(data.success).toBe(false);
            expect(data.message).toBe('Too many search requests. Please try again later.');
        });

        it('should return 400 for invalid query parameters', async () => {
            const request = mockAuthenticatedRequest('http://localhost:3000/api/search/quick'); // Missing query
            const response = await quickSearchGet(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.success).toBe(false);
            expect(data.message).toBe('Invalid search parameters');
        });

        it('should return quick search suggestions for cards', async () => {
            const mockCards = [
                {
                    name: 'Michael Jordan 1998',
                    player: 'Michael Jordan',
                    imageUrl: 'https://example.com/jordan.jpg'
                },
                {
                    name: 'Kobe Bryant 2000',
                    player: 'Kobe Bryant',
                    imageUrl: null
                }
            ];

            prismaMock.card.findMany.mockResolvedValue(mockCards);
            prismaMock.user.findMany.mockResolvedValue([]);
            prismaMock.card.groupBy.mockResolvedValue([]);

            const request = mockAuthenticatedRequest('http://localhost:3000/api/search/quick?query=Michael&type=cards&limit=5');
            const response = await quickSearchGet(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data.message).toBe('Quick search completed successfully');
            expect(data.data.suggestions).toHaveLength(2);
            expect(data.data.suggestions[0]).toEqual({
                text: 'Michael Jordan 1998 - Michael Jordan',
                type: 'card',
                imageUrl: 'https://example.com/jordan.jpg'
            });
            expect(data.data.suggestions[1]).toEqual({
                text: 'Kobe Bryant 2000 - Kobe Bryant',
                type: 'card'
            });
        });

        it('should return quick search suggestions for users', async () => {
            const mockUsers = [
                {
                    name: 'John Collector',
                    email: 'john@example.com',
                    profileImageUrl: 'https://example.com/john.jpg',
                    _count: { followers: 25 }
                },
                {
                    name: null,
                    email: 'jane@example.com',
                    profileImageUrl: null,
                    _count: { followers: 10 }
                }
            ];

            prismaMock.card.findMany.mockResolvedValue([]);
            prismaMock.user.findMany.mockResolvedValue(mockUsers);
            prismaMock.card.groupBy.mockResolvedValue([]);

            const request = mockAuthenticatedRequest('http://localhost:3000/api/search/quick?query=john&type=users&limit=5');
            const response = await quickSearchGet(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data.data.suggestions).toHaveLength(2);
            expect(data.data.suggestions[0]).toEqual({
                text: 'John Collector',
                type: 'user',
                count: 25,
                imageUrl: 'https://example.com/john.jpg'
            });
            expect(data.data.suggestions[1]).toEqual({
                text: 'jane@example.com',
                type: 'user',
                count: 10
            });
        });

        it('should return mixed suggestions for type "all"', async () => {
            const mockCards = [{
                name: 'Basketball Card',
                player: 'Player Name',
                imageUrl: null
            }];
            
            const mockUsers = [{
                name: 'Card Collector',
                email: 'collector@example.com',
                profileImageUrl: null,
                _count: { followers: 5 }
            }];

            prismaMock.card.findMany.mockResolvedValue(mockCards);
            prismaMock.user.findMany.mockResolvedValue(mockUsers);
            prismaMock.card.groupBy.mockResolvedValue([]);

            const request = mockAuthenticatedRequest('http://localhost:3000/api/search/quick?query=basket&type=all&limit=10');
            const response = await quickSearchGet(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data.data.suggestions).toHaveLength(2);
            
            // Should contain both card and user suggestions
            const types = data.data.suggestions.map(s => s.type);
            expect(types).toContain('card');
            expect(types).toContain('user');
        });
    });

    describe('GET /api/search/filters', () => {
        it('should require authentication', async () => {
            const request = mockUnauthenticatedRequest('http://localhost:3000/api/search/filters');
            const response = await searchFiltersGet(request);
            const data = await response.json();

            expect(response.status).toBe(401);
            expect(data.success).toBe(false);
            expect(data.message).toBe('Authentication required');
        });

        it('should return comprehensive filter options', async () => {
            // Mock all the different groupBy queries
            prismaMock.card.groupBy.mockImplementation((args: any) => {
                if (args.by.includes('team')) {
                    return Promise.resolve([
                        { team: 'Chicago Bulls', _count: { team: 50 } },
                        { team: 'Los Angeles Lakers', _count: { team: 45 } }
                    ]);
                }
                if (args.by.includes('player')) {
                    return Promise.resolve([
                        { player: 'Michael Jordan', _count: { player: 25 } },
                        { player: 'Kobe Bryant', _count: { player: 20 } }
                    ]);
                }
                if (args.by.includes('brand')) {
                    return Promise.resolve([
                        { brand: 'Upper Deck', _count: { brand: 100 } },
                        { brand: 'Topps', _count: { brand: 80 } }
                    ]);
                }
                if (args.by.includes('year')) {
                    return Promise.resolve([
                        { year: 1998, _count: { year: 30 } },
                        { year: 2000, _count: { year: 25 } }
                    ]);
                }
                if (args.by.includes('condition')) {
                    return Promise.resolve([
                        { condition: CardCondition.MINT, _count: { condition: 40 } },
                        { condition: CardCondition.NEAR_MINT, _count: { condition: 35 } }
                    ]);
                }
                if (args.by.includes('rarity')) {
                    return Promise.resolve([
                        { rarity: CardRarity.RARE, _count: { rarity: 20 } },
                        { rarity: CardRarity.COMMON, _count: { rarity: 60 } }
                    ]);
                }
                return Promise.resolve([]);
            });

            prismaMock.user.groupBy.mockImplementation((args: any) => {
                if (args.by.includes('role')) {
                    return Promise.resolve([
                        { role: Role.USER, _count: { role: 100 } },
                        { role: Role.ADMIN, _count: { role: 5 } }
                    ]);
                }
                if (args.by.includes('emailVerified')) {
                    return Promise.resolve([
                        { emailVerified: true, _count: { emailVerified: 90 } },
                        { emailVerified: false, _count: { emailVerified: 15 } }
                    ]);
                }
                if (args.by.includes('isSeller')) {
                    return Promise.resolve([
                        { isSeller: true, _count: { isSeller: 25 } },
                        { isSeller: false, _count: { isSeller: 80 } }
                    ]);
                }
                if (args.by.includes('languagePreference')) {
                    return Promise.resolve([
                        { languagePreference: 'en', _count: { languagePreference: 80 } },
                        { languagePreference: 'es', _count: { languagePreference: 20 } }
                    ]);
                }
                return Promise.resolve([]);
            });

            prismaMock.card.aggregate.mockResolvedValue({
                _min: { price: 5.99 },
                _max: { price: 999.99 },
                _avg: { price: 150.50 }
            });

            prismaMock.card.count.mockImplementation((args?: any) => {
                if (args?.where?.isForSale) return Promise.resolve(75);
                if (args?.where?.isForTrade) return Promise.resolve(50);
                return Promise.resolve(200); // total cards
            });

            prismaMock.user.count.mockResolvedValue(105);
            prismaMock.collection.count.mockResolvedValue(30);

            // Mock the follower stats query
            (prismaMock.$queryRaw as any).mockResolvedValue([{
                min: 0,
                max: 150,
                avg: 12.5
            }]);

            const request = mockAuthenticatedRequest('http://localhost:3000/api/search/filters');
            const response = await searchFiltersGet(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data.message).toBe('Filter options retrieved successfully');
            
            // Check card filters
            expect(data.data.cardFilters.teams).toHaveLength(2);
            expect(data.data.cardFilters.teams[0]).toEqual({
                value: 'Chicago Bulls',
                count: 50
            });
            
            expect(data.data.cardFilters.players).toHaveLength(2);
            expect(data.data.cardFilters.brands).toHaveLength(2);
            expect(data.data.cardFilters.years).toHaveLength(2);
            
            expect(data.data.cardFilters.priceRange).toEqual({
                min: 5.99,
                max: 999.99,
                average: 150.50
            });
            
            // Check user filters
            expect(data.data.userFilters.roles).toHaveLength(3); // USER, SELLER, ADMIN
            expect(data.data.userFilters.emailVerified).toHaveLength(2);
            expect(data.data.userFilters.isSeller).toHaveLength(2);
            expect(data.data.userFilters.languages).toHaveLength(2);
            
            // Check statistics
            expect(data.data.statistics.totalCards).toBe(200);
            expect(data.data.statistics.totalUsers).toBe(105);
            expect(data.data.statistics.totalCollections).toBe(30);
            expect(data.data.statistics.cardsForSale).toBe(75);
            expect(data.data.statistics.cardsForTrade).toBe(50);
        });

        it('should handle empty database gracefully', async () => {
            // Mock empty responses
            prismaMock.card.groupBy.mockResolvedValue([]);
            prismaMock.user.groupBy.mockResolvedValue([]);
            prismaMock.card.aggregate.mockResolvedValue({
                _min: { price: null },
                _max: { price: null },
                _avg: { price: null }
            });
            prismaMock.card.count.mockResolvedValue(0);
            prismaMock.user.count.mockResolvedValue(0);
            prismaMock.collection.count.mockResolvedValue(0);
            (prismaMock.$queryRaw as any).mockResolvedValue([]);

            const request = mockAuthenticatedRequest('http://localhost:3000/api/search/filters');
            const response = await searchFiltersGet(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data.data.cardFilters.priceRange).toEqual({
                min: 0,
                max: 1000,
                average: 0
            });
        });
    });
}); 