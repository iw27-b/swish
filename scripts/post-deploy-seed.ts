import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function postDeploySeed() {
  try {
    console.log('Checking database connection...');
    await prisma.$connect();
    console.log('✅ Connected to database');
    
    const userCount = await prisma.user.count();
    console.log(`Current user count: ${userCount}`);
    
    if (userCount === 0) {
      console.log('Database is empty. Seeding database...');
      const { execSync } = require('child_process');
      execSync('tsx prisma/seed.ts', { stdio: 'inherit' });
      console.log('✅ Database seeded successfully');
    } else {
      console.log(`Database already contains ${userCount} users. Skipping seed.`);
    }
  } catch (error: any) {
    console.error('❌ Error during post-deployment seeding:', error);
    if (error?.message?.includes("Can't reach database server")) {
      console.error('\n💡 Connection Error - Check:');
      console.error('1. DATABASE_URL is set correctly in Vercel environment variables');
      console.error('2. Using Supabase connection pooler (port 6543) for serverless');
      console.error('3. Database is not paused in Supabase dashboard');
      console.error('4. No IP restrictions blocking Vercel');
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

postDeploySeed();

