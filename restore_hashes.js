const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function main() {
  const users = JSON.parse(fs.readFileSync('prod_hashes_backup.json', 'utf8'));
  
  for (const user of users) {
    await prisma.user.update({
      where: { id: user.id },
      data: { password: user.password }
    });
  }
  console.log('Restored original hashes for ' + users.length + ' users');
}

main().catch(console.error).finally(() => prisma.$disconnect());
