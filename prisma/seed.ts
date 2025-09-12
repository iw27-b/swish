import { PrismaClient, Role, CardCondition, CardRarity, PurchaseStatus, TradeStatus } from '@prisma/client';
import { faker } from '@faker-js/faker';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const NBA_TEAMS = [
    'Lakers', 'Warriors', 'Celtics', 'Heat', 'Bulls', 'Knicks', 'Nets', 'Sixers',
    'Raptors', 'Bucks', 'Pacers', 'Pistons', 'Cavaliers', 'Hawks', 'Hornets',
    'Magic', 'Wizards', 'Nuggets', 'Clippers', 'Suns', 'Kings', 'Trail Blazers',
    'Jazz', 'Thunder', 'Timberwolves', 'Rockets', 'Mavericks', 'Spurs', 'Pelicans', 'Grizzlies'
];

const CARD_BRANDS = [
    'Topps', 'Panini', 'Upper Deck', 'Fleer', 'Donruss', 'Bowman', 'Score', 'Skybox'
];

const BASKETBALL_PLAYERS = [
    'LeBron James', 'Kobe Bryant', 'Michael Jordan', 'Stephen Curry', 'Kevin Durant',
    'Giannis Antetokounmpo', 'Kawhi Leonard', 'Anthony Davis', 'Luka Dončić', 'Jayson Tatum',
    'Jimmy Butler', 'Joel Embiid', 'Nikola Jokić', 'Damian Lillard', 'Russell Westbrook',
    'Chris Paul', 'Blake Griffin', 'Paul George', 'Kyrie Irving', 'James Harden',
    'Zion Williamson', 'Ja Morant', 'Trae Young', 'Devin Booker', 'Donovan Mitchell',
    'Bam Adebayo', 'Tyler Herro', 'Paolo Banchero', 'Victor Wembanyama', 'Scottie Barnes'
];

/**
 * Generate a realistic password hash
 * @param password - plain text password
 * @returns hashed password
 */
async function hashPassword(password: string): Promise<string> {
    return await argon2.hash(password);
}

/**
 * Generate fake user data
 * @param count - number of users to create
 * @returns array of user creation data
 */
async function generateUsers(count: number) {
    const users = [];

    // Create admin user
    users.push({
        email: 'admin@swish.com',
        password: await hashPassword('admin123'),
        name: 'Admin User',
        role: Role.ADMIN,
        emailVerified: true,
        isSeller: true,
        phoneNumber: faker.phone.number(),
        bio: 'Platform administrator and basketball card enthusiast',
        profileImageUrl: faker.image.avatar(),
        shippingAddress: {
            street: faker.location.streetAddress(),
            city: faker.location.city(),
            state: faker.location.state(),
            zipCode: faker.location.zipCode(),
            country: 'USA'
        }
    });

    // Create seller users
    for (let i = 0; i < Math.floor(count * 0.3); i++) {
        users.push({
            email: faker.internet.email(),
            password: await hashPassword('password123'),
            name: faker.person.fullName(),
            role: Role.SELLER,
            emailVerified: faker.datatype.boolean(0.8),
            isSeller: true,
            sellerVerificationStatus: faker.helpers.arrayElement(['VERIFIED', 'PENDING', 'VERIFIED']),
            phoneNumber: faker.phone.number(),
            dateOfBirth: faker.date.birthdate({ min: 18, max: 65, mode: 'age' }),
            bio: faker.lorem.sentence({ min: 10, max: 30 }),
            profileImageUrl: faker.image.avatar(),
            shippingAddress: {
                street: faker.location.streetAddress(),
                city: faker.location.city(),
                state: faker.location.state(),
                zipCode: faker.location.zipCode(),
                country: 'USA'
            },
            paymentMethods: [
                {
                    type: 'credit_card',
                    brand: faker.helpers.arrayElement(['Visa', 'MasterCard', 'American Express']),
                    last4: faker.finance.creditCardNumber().slice(-4),
                    expiryMonth: faker.number.int({ min: 1, max: 12 }),
                    expiryYear: faker.number.int({ min: 2024, max: 2030 })
                }
            ]
        });
    }

    // Create regular users
    for (let i = 0; i < Math.floor(count * 0.7); i++) {
        users.push({
            email: faker.internet.email(),
            password: await hashPassword('password123'),
            name: faker.person.fullName(),
            role: Role.USER,
            emailVerified: faker.datatype.boolean(0.7),
            phoneNumber: faker.datatype.boolean(0.6) ? faker.phone.number() : null,
            dateOfBirth: faker.datatype.boolean(0.8) ? faker.date.birthdate({ min: 18, max: 65, mode: 'age' }) : null,
            bio: faker.datatype.boolean(0.5) ? faker.lorem.sentence({ min: 5, max: 20 }) : null,
            profileImageUrl: faker.datatype.boolean(0.7) ? faker.image.avatar() : null,
            shippingAddress: faker.datatype.boolean(0.6) ? {
                street: faker.location.streetAddress(),
                city: faker.location.city(),
                state: faker.location.state(),
                zipCode: faker.location.zipCode(),
                country: 'USA'
            } : undefined
        });
    }

    return users;
}

/**
 * Generate fake card data
 * @param count - number of cards to create
 * @param userIds - array of user IDs to assign as owners
 * @returns array of card creation data
 */
function generateCards(count: number, userIds: string[]) {
    const cards = [];

    for (let i = 0; i < count; i++) {
        const player = faker.helpers.arrayElement(BASKETBALL_PLAYERS);
        const team = faker.helpers.arrayElement(NBA_TEAMS);
        const brand = faker.helpers.arrayElement(CARD_BRANDS);
        const year = faker.number.int({ min: 1980, max: 2024 });
        const cardNumber = faker.number.int({ min: 1, max: 500 }).toString();
        const condition = faker.helpers.enumValue(CardCondition);
        const rarity = faker.helpers.enumValue(CardRarity);
        const isForSale = faker.datatype.boolean(0.4);
        const isForTrade = faker.datatype.boolean(0.3);

        cards.push({
            name: `${year} ${brand} ${player}`,
            player,
            team,
            year,
            brand,
            cardNumber,
            condition,
            rarity,
            description: faker.datatype.boolean(0.7) ? faker.lorem.sentences({ min: 1, max: 3 }) : null,
            imageUrl: faker.datatype.boolean(0.8) ? faker.image.url({ width: 400, height: 600 }) : null,
            isForTrade,
            isForSale,
            price: isForSale ? faker.number.float({ min: 5, max: 5000, fractionDigits: 2 }) : null,
            ownerId: faker.helpers.arrayElement(userIds)
        });
    }

    return cards;
}

/**
 * Generate fake collection data
 * @param count - number of collections to create
 * @param userIds - array of user IDs to assign as owners
 * @returns array of collection creation data
 */
function generateCollections(count: number, userIds: string[]) {
    const collections = [];
    const collectionNames = [
        'Lakers Legends', 'Rookie Cards Collection', 'Championship Years', 'Vintage Basketball',
        'Modern Superstars', 'Hall of Fame Collection', 'Draft Class 2023', 'MVP Winners',
        'All-Star Collection', 'Dynasty Teams', 'Playoff Heroes', 'Olympic Champions'
    ];

    for (let i = 0; i < count; i++) {
        collections.push({
            name: faker.helpers.arrayElement(collectionNames) + ` ${faker.number.int({ min: 1, max: 999 })}`,
            description: faker.datatype.boolean(0.8) ? faker.lorem.sentence({ min: 5, max: 15 }) : null,
            isPublic: faker.datatype.boolean(0.6),
            isShared: faker.datatype.boolean(0.2),
            imageUrl: faker.datatype.boolean(0.5) ? faker.image.url({ width: 400, height: 300 }) : null,
            ownerId: faker.helpers.arrayElement(userIds)
        });
    }

    return collections;
}

/**
 * Main seeding function
 */
async function main() {
    console.log('🌱 Starting database seeding...');

    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await prisma.tradeCard.deleteMany();
    await prisma.trade.deleteMany();
    await prisma.purchase.deleteMany();
    await prisma.cardTracking.deleteMany();
    await prisma.cardFavorite.deleteMany();
    await prisma.collectionShare.deleteMany();
    await prisma.collectionCard.deleteMany();
    await prisma.collection.deleteMany();
    await prisma.userFollow.deleteMany();
    await prisma.card.deleteMany();
    await prisma.user.deleteMany();

    // Create users
    console.log('👥 Creating users...');
    const userData = await generateUsers(50);
    const users = [];
    for (const user of userData) {
        const createdUser = await prisma.user.create({ data: user });
        users.push(createdUser);
    }
    console.log(`✅ Created ${users.length} users`);

    const userIds = users.map(u => u.id);

    // Create cards
    console.log('🃏 Creating cards...');
    const cardData = generateCards(200, userIds);
    const cards = await prisma.card.createMany({ data: cardData });
    const allCards = await prisma.card.findMany();
    console.log(`✅ Created ${allCards.length} cards`);

    // Create collections
    console.log('📚 Creating collections...');
    const collectionData = generateCollections(30, userIds);
    const collections = [];
    for (const collection of collectionData) {
        const createdCollection = await prisma.collection.create({ data: collection });
        collections.push(createdCollection);
    }
    console.log(`✅ Created ${collections.length} collections`);

    // Add cards to collections
    console.log('🔗 Adding cards to collections...');
    let collectionCardsCount = 0;
    for (const collection of collections) {
        const cardsToAdd = faker.helpers.arrayElements(
            allCards.filter(card => card.ownerId === collection.ownerId),
            { min: 1, max: 10 }
        );

        for (const card of cardsToAdd) {
            try {
                await prisma.collectionCard.create({
                    data: {
                        collectionId: collection.id,
                        cardId: card.id,
                        notes: faker.datatype.boolean(0.3) ? faker.lorem.sentence() : null
                    }
                });
                collectionCardsCount++;
            } catch (error) {
                // Skip duplicates
            }
        }
    }
    console.log(`✅ Added ${collectionCardsCount} card-collection relationships`);

    // Create user follows
    console.log('👥 Creating user follows...');
    const follows = [];
    for (let i = 0; i < 100; i++) {
        const follower = faker.helpers.arrayElement(users);
        const following = faker.helpers.arrayElement(users.filter(u => u.id !== follower.id));

        try {
            await prisma.userFollow.create({
                data: {
                    followerId: follower.id,
                    followingId: following.id
                }
            });
            follows.push({ followerId: follower.id, followingId: following.id });
        } catch (error) {
            // Skip duplicates
        }
    }
    console.log(`✅ Created ${follows.length} user follows`);

    // Create card favorites
    console.log('❤️ Creating card favorites...');
    let favoritesCount = 0;
    for (let i = 0; i < 150; i++) {
        const user = faker.helpers.arrayElement(users);
        const card = faker.helpers.arrayElement(allCards);

        try {
            await prisma.cardFavorite.create({
                data: {
                    userId: user.id,
                    cardId: card.id
                }
            });
            favoritesCount++;
        } catch (error) {
            // Skip duplicates
        }
    }
    console.log(`✅ Created ${favoritesCount} card favorites`);

    // Create card tracking
    console.log('👀 Creating card tracking...');
    let trackingCount = 0;
    for (let i = 0; i < 80; i++) {
        const user = faker.helpers.arrayElement(users);
        const card = faker.helpers.arrayElement(allCards.filter(c => c.isForSale));

        if (card) {
            try {
                await prisma.cardTracking.create({
                    data: {
                        userId: user.id,
                        cardId: card.id,
                        targetPrice: faker.datatype.boolean(0.7) ? faker.number.float({ min: 1, max: card.price || 100, fractionDigits: 2 }) : null,
                        notifyOnSale: faker.datatype.boolean(0.8),
                        notifyOnPriceChange: faker.datatype.boolean(0.9)
                    }
                });
                trackingCount++;
            } catch (error) {
                // Skip duplicates
            }
        }
    }
    console.log(`✅ Created ${trackingCount} card tracking entries`);

    // Create purchases
    console.log('💰 Creating purchases...');
    const purchasesData = [];
    const sellableCards = allCards.filter(card => card.isForSale && card.price);

    for (let i = 0; i < 50; i++) {
        const card = faker.helpers.arrayElement(sellableCards);
        const buyer = faker.helpers.arrayElement(users.filter(u => u.id !== card.ownerId));
        const seller = users.find(u => u.id === card.ownerId);

        if (seller) {
            purchasesData.push({
                buyerId: buyer.id,
                sellerId: seller.id,
                cardId: card.id,
                price: card.price!,
                status: faker.helpers.enumValue(PurchaseStatus),
                paymentMethod: faker.helpers.arrayElement(['Credit Card', 'PayPal', 'Bank Transfer']),
                shippingAddress: {
                    street: faker.location.streetAddress(),
                    city: faker.location.city(),
                    state: faker.location.state(),
                    zipCode: faker.location.zipCode(),
                    country: 'USA'
                },
                trackingNumber: faker.datatype.boolean(0.6) ? faker.string.alphanumeric(10).toUpperCase() : null,
                notes: faker.datatype.boolean(0.3) ? faker.lorem.sentence() : null,
                completedAt: faker.datatype.boolean(0.7) ? faker.date.recent({ days: 30 }) : null
            });
        }
    }

    const purchases = await prisma.purchase.createMany({ data: purchasesData });
    console.log(`✅ Created ${purchasesData.length} purchases`);

    // Create trades
    console.log('🔄 Creating trades...');
    const tradesData = [];
    const tradableCards = allCards.filter(card => card.isForTrade);

    for (let i = 0; i < 30; i++) {
        const initiator = faker.helpers.arrayElement(users);
        const recipient = faker.helpers.arrayElement(users.filter(u => u.id !== initiator.id));

        const trade = await prisma.trade.create({
            data: {
                initiatorId: initiator.id,
                recipientId: recipient.id,
                status: faker.helpers.enumValue(TradeStatus),
                message: faker.datatype.boolean(0.8) ? faker.lorem.sentence({ min: 5, max: 15 }) : null,
                responseMessage: faker.datatype.boolean(0.5) ? faker.lorem.sentence({ min: 3, max: 10 }) : null,
                completedAt: faker.datatype.boolean(0.3) ? faker.date.recent() : null,
                expiresAt: faker.date.future()
            }
        });

        // Add cards to trade (offered and requested)
        const initiatorCards = tradableCards.filter(card => card.ownerId === initiator.id);
        const recipientCards = tradableCards.filter(card => card.ownerId === recipient.id);

        if (initiatorCards.length > 0 && recipientCards.length > 0) {
            // Cards offered by initiator
            const offeredCards = faker.helpers.arrayElements(initiatorCards, { min: 1, max: 3 });
            for (const card of offeredCards) {
                await prisma.tradeCard.create({
                    data: {
                        tradeId: trade.id,
                        cardId: card.id,
                        isOffered: true
                    }
                });
            }

            // Cards requested from recipient
            const requestedCards = faker.helpers.arrayElements(recipientCards, { min: 1, max: 3 });
            for (const card of requestedCards) {
                await prisma.tradeCard.create({
                    data: {
                        tradeId: trade.id,
                        cardId: card.id,
                        isOffered: false
                    }
                });
            }
        }

        tradesData.push(trade);
    }
    console.log(`✅ Created ${tradesData.length} trades`);

    // Create collection shares
    console.log('🤝 Creating collection shares...');
    let sharesCount = 0;
    const sharedCollections = collections.filter(c => c.isShared);

    for (const collection of sharedCollections) {
        const usersToShareWith = faker.helpers.arrayElements(
            users.filter(u => u.id !== collection.ownerId),
            { min: 1, max: 5 }
        );

        for (const user of usersToShareWith) {
            try {
                await prisma.collectionShare.create({
                    data: {
                        collectionId: collection.id,
                        userId: user.id,
                        canEdit: faker.datatype.boolean(0.3)
                    }
                });
                sharesCount++;
            } catch (error) {
                // Skip duplicates
            }
        }
    }
    console.log(`✅ Created ${sharesCount} collection shares`);

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`👥 Users: ${users.length}`);
    console.log(`🃏 Cards: ${allCards.length}`);
    console.log(`📚 Collections: ${collections.length}`);
    console.log(`🔗 Collection Cards: ${collectionCardsCount}`);
    console.log(`👥 User Follows: ${follows.length}`);
    console.log(`❤️ Card Favorites: ${favoritesCount}`);
    console.log(`👀 Card Tracking: ${trackingCount}`);
    console.log(`💰 Purchases: ${purchasesData.length}`);
    console.log(`🔄 Trades: ${tradesData.length}`);
    console.log(`🤝 Collection Shares: ${sharesCount}`);
    console.log('\n🔑 Admin login: admin@swish.com / admin123');
    console.log('🔑 User password: password123 (for all other users)');
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
