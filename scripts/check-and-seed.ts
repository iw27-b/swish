import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAndSeed() {
  const isBuildTime = process.env.VERCEL === '1' || process.env.CI === 'true';
  
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
  } catch (error: any) {
    const isTableMissingError = 
      error?.code === 'P2021' ||
      error?.message?.includes('does not exist') ||
      error?.message?.includes('table') && error?.message?.includes('not exist');
    
    const isConnectionError = 
      error?.message?.includes("Can't reach database server") ||
      error?.message?.includes("connect ECONNREFUSED") ||
      error?.message?.includes("P1001") ||
      error?.code === 'P1001';
    
    if (isTableMissingError) {
      console.warn('⚠️  Database tables do not exist. Migrations need to be run first.');
      console.warn('⚠️  Skipping seed check. Tables will be created by migrations.');
      return;
    }
    
    if (isConnectionError && isBuildTime) {
      console.warn('⚠️  Cannot connect to database during build. This is expected on Vercel.');
      console.warn('⚠️  Seeding will be skipped. Run migrations and seeding after deployment.');
      return;
    }
    
    console.error('Error checking/seeding database:', error);
    if (!isBuildTime) {
      process.exit(1);
    }
  } finally {
    await prisma.$disconnect();
  }
}

checkAndSeed();

