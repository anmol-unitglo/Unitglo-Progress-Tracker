import { PrismaClient, Role } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting production initialization seed...')

  // Check if any users exist to prevent accidental resets
  const userCount = await prisma.user.count()
  
  if (userCount > 0) {
    console.log('Production database already contains users. Skipping seed to prevent data corruption.')
    return
  }

  // Create initial Admin/CEO
  const passwordHash = await bcrypt.hash(process.env.INITIAL_ADMIN_PASSWORD || 'ChangeMeImmediately!', 10)

  const ceo = await prisma.user.create({
    data: { 
      email: process.env.INITIAL_ADMIN_EMAIL || 'admin@example.com', 
      password: passwordHash, 
      name: 'Initial Admin', 
      role: Role.CEO 
    }
  })

  console.log('Initial Admin (CEO) created successfully.')
  console.log(`Email: ${ceo.email}`)
  console.log('Please log in and immediately change your password or create your actual PM/CEO accounts.')
}

main()
  .catch((e) => {
    console.error('Failed to run production seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
