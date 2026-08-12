const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ select: { email: true, isActive: true } });
  
  console.log('Production Users After Migration:');
  for (const user of users) {
    console.log(`- ${user.email} (isActive: ${user.isActive})`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
