import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAndSeed() {
  try {
    const userCount = await prisma.user.count();
    
    if (userCount === 0) {
      console.log('Database is empty. Seeding database...');
      const { execSync } = require('child_process');
      execSync('tsx prisma/seed.ts', { stdio: 'inherit' });
      console.log('Database seeded successfully');
    } else {
      console.log(`Database already contains ${userCount} users. Skipping seed.`);
    }
  } catch (error) {
    console.error('Error checking/seeding database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkAndSeed();

