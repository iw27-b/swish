import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testConnection() {
  try {
    console.log('Testing Prisma connection...');
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
    console.log('DIRECT_URL:', process.env.DIRECT_URL ? 'Set' : 'Not set');
    
    await prisma.$connect();
    console.log('✅ Prisma connected successfully!');
    
    const result = await prisma.$queryRaw`SELECT version()`;
    console.log('Database version:', result);
    
    try {
      const userCount = await prisma.user.count();
      console.log(`User count: ${userCount}`);
    } catch (error: any) {
      if (error.code === 'P2021') {
        console.log('⚠️  Tables do not exist - migrations need to be applied');
        console.log('Run: npx prisma migrate deploy (production) or npx prisma migrate dev (development)');
      } else {
        throw error;
      }
    }
    
  } catch (error: any) {
    console.error('❌ Prisma connection failed:');
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    
    if (error.message.includes('SSL')) {
      console.error('\n💡 SSL Error detected!');
      console.error('Your connection string likely needs SSL parameters.');
      console.error('Add ?sslmode=require to your DATABASE_URL');
    }
    
    if (error.message.includes('timeout') || error.message.includes('ECONNREFUSED')) {
      console.error('\n💡 Connection timeout/refused!');
      console.error('Check:');
      console.error('1. Are you using the direct connection (port 5432) for migrations?');
      console.error('2. Is your Supabase database active (not paused)?');
      console.error('3. Are firewall rules blocking the connection?');
    }
    
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();

