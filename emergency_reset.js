const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function main() {
  const targetEmail = 'admin@example.com';
  
  // Find the user
  const user = await prisma.user.findUnique({
    where: { email: targetEmail }
  });

  if (!user) {
    console.error(`User ${targetEmail} not found in the production database.`);
    return;
  }

  // Generate a secure temporary password
  const tempPassword = crypto.randomBytes(8).toString('hex');
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  // Update the user and log the activity transactionally
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { password: passwordHash }
    });

    await tx.activityLog.create({
      data: {
        userId: user.id, // Logging it against themselves for an emergency reset
        action: "PASSWORD_ADMINISTRATIVE_RESET",
        entityType: "USER",
        entityId: user.id,
        metadata: JSON.stringify({ reason: "Emergency Database Admin Reset", actor: "System Administrator" })
      }
    });
  });

  console.log(`Password for ${targetEmail} successfully reset.`);
  console.log(`TEMP_PASSWORD=${tempPassword}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
