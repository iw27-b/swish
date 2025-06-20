import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { DeepMockProxy } from 'vitest-mock-extended';
import { PrismaClient, CardCondition, CardRarity, Role } from '@prisma/client';

import { GET as cardsGet, POST as cardsPost } from '@/app/api/cards/route';
import prisma from '@/lib/prisma';

const prismaMock = prisma as unknown as DeepMockProxy<typeof prisma>;

const mockAuthenticatedRequest = (url: string, method: string = 'GET', body?: any): NextRequest => {
    const request = new NextRequest(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
    });
    
    (request as any).user = {
        userId: 'user-123',
        role: Role.USER,
        email: 'test@example.com'
    };
    
    return request;
};

const mockUnauthenticatedRequest = (url: string, method: string = 'GET', body?: any): NextRequest => {
    return new NextRequest(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
    });
};

const mockCard = {
    id: 'card-123',
    name: '1998 Upper Deck Michael Jordan',
    player: 'Michael Jordan',
    team: 'Chicago Bulls',
    year: 1998,
    brand: 'Upper Deck',
    cardNumber: '#23',
    condition: CardCondition.MINT,
    rarity: CardRarity.RARE,
    description: 'Excellent condition card',
    imageUrl: 'https://example.com/card.jpg',
    isForTrade: true,
    isForSale: true,
    price: 199.99,
    ownerId: 'user-123',
    createdAt: new Date(),
    updatedAt: new Date(),
    owner: {
        id: 'user-123',
        name: 'Card Owner',
        email: 'owner@example.com'
    }
};

describe('Cards Endpoints', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('GET /api/cards', () => {
        it('should list cards with default pagination', async () => {
            prismaMock.card.count.mockResolvedValue(1);
            prismaMock.card.findMany.mockResolvedValue([mockCard]);

            const request = mockUnauthenticatedRequest('http://localhost:3000/api/cards');
            const response = await cardsGet(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data.message).toBe('Cards retrieved successfully');
            expect(data.data.items).toHaveLength(1);
            expect(data.data.items[0]).toMatchObject({
                id: mockCard.id,
                name: mockCard.name,
                player: mockCard.player,
                team: mockCard.team,
                year: mockCard.year,
                brand: mockCard.brand,
                cardNumber: mockCard.cardNumber,
                condition: mockCard.condition,
                rarity: mockCard.rarity,
                description: mockCard.description,
                imageUrl: mockCard.imageUrl,
                isForTrade: mockCard.isForTrade,
                isForSale: mockCard.isForSale,
                price: mockCard.price,
                ownerId: mockCard.ownerId
            });
            expect(data.data.pagination).toBeDefined();
            expect(data.data.pagination.page).toBe(1);
            expect(data.data.pagination.pageSize).toBe(10);
            expect(data.data.pagination.total).toBe(1);
        });

        it('should filter cards by search query', async () => {
            prismaMock.card.count.mockResolvedValue(1);
            prismaMock.card.findMany.mockResolvedValue([mockCard]);

            const request = mockUnauthenticatedRequest('http://localhost:3000/api/cards?search=Jordan');
            const response = await cardsGet(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data.data.items).toHaveLength(1);
            
            // Verify the where clause includes OR condition for search
            expect(prismaMock.card.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        OR: expect.arrayContaining([
                            { name: { contains: 'Jordan', mode: 'insensitive' } },
                            { player: { contains: 'Jordan', mode: 'insensitive' } },
                            { team: { contains: 'Jordan', mode: 'insensitive' } },
                            { brand: { contains: 'Jordan', mode: 'insensitive' } }
                        ])
                    })
                })
            );
        });

        it('should filter cards by multiple parameters', async () => {
            prismaMock.card.count.mockResolvedValue(1);
            prismaMock.card.findMany.mockResolvedValue([mockCard]);

            const request = mockUnauthenticatedRequest(
                'http://localhost:3000/api/cards?player=Jordan&team=Bulls&year=1998&isForSale=true&minPrice=100&maxPrice=300'
            );
            const response = await cardsGet(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            expect(prismaMock.card.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        player: { contains: 'Jordan', mode: 'insensitive' },
                        team: { contains: 'Bulls', mode: 'insensitive' },
                        year: 1998,
                        isForSale: true,
                        price: { gte: 100, lte: 300 }
                    })
                })
            );
        });

        it('should handle custom pagination', async () => {
            prismaMock.card.count.mockResolvedValue(50);
            prismaMock.card.findMany.mockResolvedValue([mockCard]);

            const request = mockUnauthenticatedRequest('http://localhost:3000/api/cards?page=2&pageSize=20');
            const response = await cardsGet(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.data.pagination.page).toBe(2);
            expect(data.data.pagination.pageSize).toBe(20);
            expect(data.data.pagination.total).toBe(50);
            expect(data.data.pagination.totalPages).toBe(3);
            
            // Verify offset calculation
            expect(prismaMock.card.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    skip: 20, // (page 2 - 1) * pageSize 20 = 20
                    take: 20
                })
            );
        });

        it('should handle sorting', async () => {
            prismaMock.card.count.mockResolvedValue(1);
            prismaMock.card.findMany.mockResolvedValue([mockCard]);

            const request = mockUnauthenticatedRequest('http://localhost:3000/api/cards?sortBy=price&sortOrder=asc');
            const response = await cardsGet(request);

            expect(response.status).toBe(200);
            expect(prismaMock.card.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    orderBy: { price: 'asc' }
                })
            );
        });

        it('should return 400 for invalid query parameters', async () => {
            const request = mockUnauthenticatedRequest('http://localhost:3000/api/cards?year=invalid');
            const response = await cardsGet(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.success).toBe(false);
            expect(data.message).toBe('Invalid query parameters');
        });

        it('should handle empty results', async () => {
            prismaMock.card.count.mockResolvedValue(0);
            prismaMock.card.findMany.mockResolvedValue([]);

            const request = mockUnauthenticatedRequest('http://localhost:3000/api/cards');
            const response = await cardsGet(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data.data.items).toHaveLength(0);
            expect(data.data.pagination.total).toBe(0);
        });
    });

    describe('POST /api/cards', () => {
        const validCardData = {
            name: '1998 Upper Deck Michael Jordan',
            player: 'Michael Jordan',
            team: 'Chicago Bulls',
            year: 1998,
            brand: 'Upper Deck',
            cardNumber: '#23',
            condition: 'MINT',
            rarity: 'RARE',
            description: 'Excellent condition card',
            imageUrl: 'https://example.com/card.jpg',
            isForTrade: true,
            isForSale: true,
            price: 199.99
        };

        it('should require authentication', async () => {
            const request = mockUnauthenticatedRequest('http://localhost:3000/api/cards', 'POST', validCardData);
            const response = await cardsPost(request);
            const data = await response.json();

            expect(response.status).toBe(401);
            expect(data.success).toBe(false);
            expect(data.message).toBe('Authentication required');
        });

        it('should create a new card successfully', async () => {
            prismaMock.card.create.mockResolvedValue(mockCard);

            const request = mockAuthenticatedRequest('http://localhost:3000/api/cards', 'POST', validCardData);
            const response = await cardsPost(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data.message).toBe('Card created successfully');
            expect(data.data).toMatchObject({
                id: mockCard.id,
                name: mockCard.name,
                player: mockCard.player,
                team: mockCard.team,
                year: mockCard.year,
                brand: mockCard.brand,
                cardNumber: mockCard.cardNumber,
                condition: mockCard.condition,
                rarity: mockCard.rarity,
                description: mockCard.description,
                imageUrl: mockCard.imageUrl,
                isForTrade: mockCard.isForTrade,
                isForSale: mockCard.isForSale,
                price: mockCard.price,
                ownerId: mockCard.ownerId
            });
            
            expect(prismaMock.card.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    ...validCardData,
                    ownerId: 'user-123'
                }),
                include: expect.objectContaining({
                    owner: expect.any(Object)
                })
            });
        });

        it('should return 400 for invalid card data', async () => {
            const invalidCardData = {
                name: '', // Invalid: empty name
                player: 'Michael Jordan',
                team: 'Chicago Bulls',
                year: 1800, // Invalid: year too old
                brand: 'Upper Deck',
                cardNumber: '#23',
                condition: 'MINT',
                rarity: 'RARE'
            };

            const request = mockAuthenticatedRequest('http://localhost:3000/api/cards', 'POST', invalidCardData);
            const response = await cardsPost(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.success).toBe(false);
            expect(data.message).toBe('Invalid request data');
            expect(data.errors).toBeDefined();
        });

        it('should require price when card is for sale', async () => {
            const cardDataMissingPrice = {
                ...validCardData,
                isForSale: true,
                price: undefined
            };

            const request = mockAuthenticatedRequest('http://localhost:3000/api/cards', 'POST', cardDataMissingPrice);
            const response = await cardsPost(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.success).toBe(false);
            expect(data.message).toBe('Invalid request data');
        });

        it('should not allow price when card is not for sale', async () => {
            const cardDataWithUnneededPrice = {
                ...validCardData,
                isForSale: false,
                price: 199.99
            };

            const request = mockAuthenticatedRequest('http://localhost:3000/api/cards', 'POST', cardDataWithUnneededPrice);
            const response = await cardsPost(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.success).toBe(false);
            expect(data.message).toBe('Invalid request data');
        });

        it('should handle database errors', async () => {
            prismaMock.card.create.mockRejectedValue(new Error('Database error'));

            const request = mockAuthenticatedRequest('http://localhost:3000/api/cards', 'POST', validCardData);
            const response = await cardsPost(request);
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.success).toBe(false);
            expect(data.message).toBe('Internal server error');
        });

        it('should return 413 for request too large', async () => {
            const largeCardData = {
                ...validCardData,
                description: 'x'.repeat(100000) // Very large description
            };

            const request = mockAuthenticatedRequest('http://localhost:3000/api/cards', 'POST', largeCardData);
            const response = await cardsPost(request);
            const data = await response.json();

            expect(response.status).toBe(413);
            expect(data.success).toBe(false);
            expect(data.message).toBe('Request too large');
        });
    });
}); 