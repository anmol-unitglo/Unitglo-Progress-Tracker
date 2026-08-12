const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.count();
  const projects = await prisma.project.count();
  const tasks = await prisma.task.count();
  const activities = await prisma.activityLog.count();
  
  console.log('Production Database Counts Before Migration:');
  console.log(`Users: ${users}`);
  console.log(`Projects: ${projects}`);
  console.log(`Tasks: ${tasks}`);
  console.log(`Activity Logs: ${activities}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
