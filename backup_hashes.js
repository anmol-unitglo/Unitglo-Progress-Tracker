const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, password: true, role: true }
  });
  
  fs.writeFileSync('prod_hashes_backup.json', JSON.stringify(users, null, 2));
  console.log('Backed up hashes for ' + users.length + ' users');
}

main().catch(console.error).finally(() => prisma.$disconnect());
