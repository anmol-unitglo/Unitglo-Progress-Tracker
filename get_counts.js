const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  console.log('Users:', await prisma.user.count());
  console.log('Projects:', await prisma.project.count());
  console.log('Tasks:', await prisma.task.count());
  console.log('Logs:', await prisma.activityLog.count());
}
main().catch(console.error).finally(() => prisma.$disconnect());
