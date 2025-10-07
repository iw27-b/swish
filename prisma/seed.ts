import { PrismaClient, Role, CardCondition, CardRarity, PurchaseStatus, TradeStatus } from '@prisma/client';
import { faker } from '@faker-js/faker';
import * as argon2 from 'argon2';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface CSVCard {
    imageid: string;
    name: string;
    player: string;
    team: string;
    year: string;
    brand: string;
    cardNumber: string;
    condition: string;
    rarity: string;
    description: string;
    imageUrl: string;
    price: string;
}


/**
 * Map CSV condition values to CardCondition enum
 */
function mapCondition(condition: string): CardCondition {
    const upperCondition = condition.toUpperCase();
    
    if (upperCondition.includes('PSA 10') || upperCondition.includes('MINT')) {
        return CardCondition.MINT;
    } else if (upperCondition.includes('PSA 9') || upperCondition.includes('NEAR MINT')) {
        return CardCondition.NEAR_MINT;
    } else if (upperCondition.includes('PSA 8') || upperCondition.includes('EXCELLENT')) {
        return CardCondition.EXCELLENT;
    } else if (upperCondition.includes('PSA 7') || upperCondition.includes('VERY GOOD')) {
        return CardCondition.VERY_GOOD;
    } else if (upperCondition.includes('PSA 6') || upperCondition.includes('GOOD')) {
        return CardCondition.GOOD;
    } else if (upperCondition.includes('未査定') || upperCondition.includes('UNGRADED')) {
        return CardCondition.GOOD; // Default for ungraded
    } else {
        return CardCondition.GOOD; // Default fallback
    }
}

/**
 * Map CSV rarity values to CardRarity enum
 */
function mapRarity(rarity: string): CardRarity {
    const upperRarity = rarity.toUpperCase();
    
    if (upperRarity.includes('LEGENDARY') || upperRarity.includes('HOLOGRAM') || upperRarity.includes('LIMITED EDITION')) {
        return CardRarity.LEGENDARY;
    } else if (upperRarity.includes('SECRET') || upperRarity.includes('AUTOGRAPH') || upperRarity.includes('AUTO') || upperRarity.includes('SIGNATURE')) {
        return CardRarity.SECRET_RARE;
    } else if (upperRarity.includes('ULTRA') || upperRarity.includes('ROOKIE') || upperRarity.includes('INSERT') || upperRarity.includes('SHORT PRINT') || upperRarity.includes('PREMIUM')) {
        return CardRarity.ULTRA_RARE;
    } else if (upperRarity.includes('RARE') || upperRarity.includes('PROMO') || upperRarity.includes('PARALLEL')) {
        return CardRarity.RARE;
    } else if (upperRarity.includes('UNCOMMON')) {
        return CardRarity.UNCOMMON;
    } else {
        return CardRarity.COMMON; // Default fallback
    }
}

/**
 * Parse price string to number
 */
function parsePrice(priceStr: string): number | null {
    if (!priceStr) return null;
    const cleanPrice = priceStr.replace(/[US$,\s]/g, '');
    const price = parseFloat(cleanPrice);
    
    return isNaN(price) ? null : price;
}

/**
 * Parse CSV file and return card data
 * Properly handles quoted fields and multi-line descriptions
 */
function parseCSVCards(): CSVCard[] {
    try {
        const csvPath = path.join(process.cwd(), 'src', 'CARD.csv');
        const csvContent = fs.readFileSync(csvPath, 'utf-8');
        
        function parseCSV(content: string): string[][] {
            const rows: string[][] = [];
            const lines = content.split('\n');
            let currentRow: string[] = [];
            let currentField = '';
            let inQuotes = false;
            let i = 0;
            
            while (i < lines.length) {
                const line = lines[i];
                let j = 0;
                
                while (j < line.length) {
                    const char = line[j];
                    
                    if (char === '"') {
                        if (inQuotes && j + 1 < line.length && line[j + 1] === '"') {
                            currentField += '"';
                            j += 2;
                        } else {
                            inQuotes = !inQuotes;
                            j++;
                        }
                    } else if (char === ',' && !inQuotes) {
                        currentRow.push(currentField.trim());
                        currentField = '';
                        j++;
                    } else {
                        currentField += char;
                        j++;
                    }
                }
                
                if (inQuotes) {
                    currentField += '\n';
                } else {
                    currentRow.push(currentField.trim());
                    if (currentRow.some(field => field.length > 0)) {
                        rows.push(currentRow);
                    }
                    currentRow = [];
                    currentField = '';
                }
                
                i++;
            }
            
            if (currentRow.length > 0 || currentField.length > 0) {
                currentRow.push(currentField.trim());
                if (currentRow.some(field => field.length > 0)) {
                    rows.push(currentRow);
                }
            }
            
            return rows;
        }
        
        const rows = parseCSV(csvContent);
        const cards: CSVCard[] = [];
        
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            
            if (row.length >= 12) {
                cards.push({
                    imageid: row[0]?.trim() || '',
                    name: row[1]?.trim() || '',
                    player: row[2]?.trim() || '',
                    team: row[3]?.trim() || '',
                    year: row[4]?.trim() || '',
                    brand: row[5]?.trim() || '',
                    cardNumber: row[6]?.trim() || '',
                    condition: row[7]?.trim() || '',
                    rarity: row[8]?.trim() || '',
                    description: row[9]?.trim() || '',
                    imageUrl: row[10]?.trim() || '',
                    price: row[11]?.trim() || ''
                });
            }
        }
        
        console.log(`📄 Parsed ${cards.length} cards from CSV`);
        return cards;
    } catch (error) {
        console.error('Error parsing CSV:', error);
        return [];
    }
}

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
 * Generate card data from CSV file only
 * @param userIds - array of user IDs to assign as owners
 * @returns array of card creation data from CSV
 */
function generateCardsFromCSV(userIds: string[]) {
    const csvCards = parseCSVCards();
    const cards = [];

    for (const csvCard of csvCards) {
        const year = parseInt(csvCard.year) || 2023;
        const price = parsePrice(csvCard.price);
        const isForSale = price !== null && price > 0;
        const isForTrade = faker.datatype.boolean(0.6); // 60% chance for trade
        
        // Map image to local file
        const imageExtension = csvCard.imageid === '1' || csvCard.imageid === '2' || csvCard.imageid === '3' || 
                              csvCard.imageid === '4' || csvCard.imageid === '6' || csvCard.imageid === '7' || 
                              csvCard.imageid === '8' || csvCard.imageid === '9' ? 'png' : 'webp';
        const localImageUrl = `/images/cards/${csvCard.imageid}.${imageExtension}`;

        cards.push({
            name: csvCard.name,
            player: csvCard.player,
            team: csvCard.team,
            year,
            brand: csvCard.brand,
            cardNumber: csvCard.cardNumber || csvCard.imageid,
            condition: mapCondition(csvCard.condition),
            rarity: mapRarity(csvCard.rarity),
            description: csvCard.description || null,
            imageUrl: localImageUrl,
            isForTrade,
            isForSale,
            price: isForSale ? price : null,
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

    // Create cards from CSV data only
    console.log('🃏 Creating cards from CSV data...');
    const cardData = generateCardsFromCSV(userIds);
    const cards = await prisma.card.createMany({ data: cardData });
    const allCards = await prisma.card.findMany();
    console.log(`✅ Created ${allCards.length} cards from CSV data`);

    // Create collections  
    console.log('📚 Creating collections...');
    // Create fewer collections since we have fewer cards
    const collectionData = generateCollections(15, userIds);
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
    // Create fewer follows to match the smaller dataset
    for (let i = 0; i < 40; i++) {
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
    // Create fewer favorites since we have fewer cards
    const favoriteAttempts = Math.min(50, allCards.length * 2);
    for (let i = 0; i < favoriteAttempts; i++) {
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
    // Create fewer tracking entries since we have fewer cards
    const trackingAttempts = Math.min(30, allCards.length);
    for (let i = 0; i < trackingAttempts; i++) {
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

    // Create purchases - DISABLED to keep all cards available for testing cart/checkout
    // console.log('💰 Creating purchases...');
    // const purchasesData = [];
    // const sellableCards = allCards.filter(card => card.isForSale && card.price);

    // // Create fewer purchases since we have fewer cards
    // const purchaseCount = Math.min(15, sellableCards.length);
    // for (let i = 0; i < purchaseCount; i++) {
    //     const card = faker.helpers.arrayElement(sellableCards);
    //     const buyer = faker.helpers.arrayElement(users.filter(u => u.id !== card.ownerId));
    //     const seller = users.find(u => u.id === card.ownerId);

    //     if (seller) {
    //         purchasesData.push({
    //             buyerId: buyer.id,
    //             sellerId: seller.id,
    //             cardId: card.id,
    //             price: card.price!,
    //             status: faker.helpers.enumValue(PurchaseStatus),
    //             paymentMethod: faker.helpers.arrayElement(['Credit Card', 'PayPal', 'Bank Transfer']),
    //             shippingAddress: {
    //                 street: faker.location.streetAddress(),
    //                 city: faker.location.city(),
    //                 state: faker.location.state(),
    //                 zipCode: faker.location.zipCode(),
    //                 country: 'USA'
    //             },
    //             trackingNumber: faker.datatype.boolean(0.6) ? faker.string.alphanumeric(10).toUpperCase() : null,
    //             notes: faker.datatype.boolean(0.3) ? faker.lorem.sentence() : null,
    //             completedAt: faker.datatype.boolean(0.7) ? faker.date.recent({ days: 30 }) : null
    //         });
    //     }
    // }

    // const purchases = await prisma.purchase.createMany({ data: purchasesData });
    // console.log(`✅ Created ${purchasesData.length} purchases`);
    // console.log('💰 Skipping purchase creation (disabled for testing)');

    // Create trades
    console.log('🔄 Creating trades...');
    const tradesData = [];
    const tradableCards = allCards.filter(card => card.isForTrade);

    // Create fewer trades since we have fewer cards
    const tradeCount = Math.min(10, Math.floor(tradableCards.length / 2));
    for (let i = 0; i < tradeCount; i++) {
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
    console.log(`🃏 Cards: ${allCards.length} (all from CSV data)`);
    console.log(`📚 Collections: ${collections.length}`);
    console.log(`🔗 Collection Cards: ${collectionCardsCount}`);
    console.log(`👥 User Follows: ${follows.length}`);
    console.log(`❤️ Card Favorites: ${favoritesCount}`);
    console.log(`👀 Card Tracking: ${trackingCount}`);
    console.log(`💰 Purchases: 0 (disabled for testing)`);
    console.log(`🔄 Trades: ${tradesData.length}`);
    console.log(`🤝 Collection Shares: ${sharesCount}`);
    console.log('\n🔑 Admin login: admin@swish.com / admin123');
    console.log('🔑 User password: password123 (for all other users)');
    console.log('\n📷 Card images: Using local images from /public/images/cards/');
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
