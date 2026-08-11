import { PrismaClient, Role, ProjectStatus, Priority, TaskStatus, TestStatus } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting seed...')

  // Clean up existing data (in a real app, use caution)
  await prisma.activityLog.deleteMany()
  await prisma.defect.deleteMany()
  await prisma.taskRetest.deleteMany()
  await prisma.taskTesting.deleteMany()
  await prisma.taskUpdate.deleteMany()
  await prisma.task.deleteMany()
  await prisma.projectMember.deleteMany()
  await prisma.project.deleteMany()
  await prisma.user.deleteMany()

  const passwordHash = await bcrypt.hash('password123', 10)

  // 1. Create Users
  const ceo = await prisma.user.create({
    data: { email: 'ceo@devtrack.local', password: passwordHash, name: 'Alice CEO', role: Role.CEO }
  })
  
  const pm = await prisma.user.create({
    data: { email: 'pm@devtrack.local', password: passwordHash, name: 'Bob PM', role: Role.PM }
  })

  const dev1 = await prisma.user.create({
    data: { email: 'developer1@devtrack.local', password: passwordHash, name: 'Charlie Dev1', role: Role.DEVELOPER }
  })

  const dev2 = await prisma.user.create({
    data: { email: 'developer2@devtrack.local', password: passwordHash, name: 'Dave Dev2', role: Role.DEVELOPER }
  })

  const tester = await prisma.user.create({
    data: { email: 'tester@devtrack.local', password: passwordHash, name: 'Eve Tester', role: Role.TESTER }
  })

  console.log('Users created')

  // 2. Create Projects
  const project1 = await prisma.project.create({
    data: {
      code: 'PRJ-ALPHA',
      name: 'Project Alpha',
      description: 'First major project',
      createdById: pm.id,
      startDate: new Date(),
      status: ProjectStatus.ACTIVE,
      members: {
        create: [
          { userId: pm.id, role: Role.PM },
          { userId: dev1.id, role: Role.DEVELOPER },
          { userId: tester.id, role: Role.TESTER }
        ]
      }
    }
  })

  const project2 = await prisma.project.create({
    data: {
      code: 'PRJ-BETA',
      name: 'Project Beta',
      description: 'Second major project',
      createdById: pm.id,
      startDate: new Date(),
      status: ProjectStatus.ACTIVE,
      members: {
        create: [
          { userId: pm.id, role: Role.PM },
          { userId: dev2.id, role: Role.DEVELOPER },
          { userId: tester.id, role: Role.TESTER }
        ]
      }
    }
  })

  console.log('Projects created')

  // 3. Create Tasks
  // Completed Task for Dev 1
  await prisma.task.create({
    data: {
      projectId: project1.id,
      title: 'Setup Database',
      module: 'Backend',
      assignedById: pm.id,
      developerId: dev1.id,
      testerId: tester.id,
      priority: Priority.HIGH,
      plannedStart: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      deadline: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      commitment: 16,
      commitmentUnit: 'HOURS',
      actualStart: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      actualCompletion: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      actualEffort: 18,
      progress: 100,
      status: TaskStatus.COMPLETED,
      testingStatus: TestStatus.PASSED,
      expectedDelivery: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      startDelay: 0,
      deliveryDelay: 1, // late by 1 day
      effortVariance: 2, // 18 - 16
      estimationAccuracy: (16 / 18) * 100,
      reworkCount: 1,
      defectCount: 1
    }
  })

  // In Progress Task for Dev 1
  await prisma.task.create({
    data: {
      projectId: project1.id,
      title: 'Build API endpoints',
      module: 'Backend',
      assignedById: pm.id,
      developerId: dev1.id,
      testerId: tester.id,
      priority: Priority.MEDIUM,
      plannedStart: new Date(),
      deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      commitment: 8,
      commitmentUnit: 'HOURS',
      actualStart: new Date(),
      actualEffort: 4,
      progress: 50,
      status: TaskStatus.IN_PROGRESS,
    }
  })

  // Task in Testing for Dev 2
  await prisma.task.create({
    data: {
      projectId: project2.id,
      title: 'Design Dashboard UI',
      module: 'Frontend',
      assignedById: pm.id,
      developerId: dev2.id,
      testerId: tester.id,
      priority: Priority.MEDIUM,
      plannedStart: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      deadline: new Date(),
      commitment: 12,
      commitmentUnit: 'HOURS',
      actualStart: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      actualEffort: 12,
      progress: 100,
      status: TaskStatus.TESTING,
      testingStatus: TestStatus.TESTING
    }
  })

  // Overdue Task for Dev 2
  await prisma.task.create({
    data: {
      projectId: project2.id,
      title: 'Fix Login Bug',
      module: 'Auth',
      assignedById: pm.id,
      developerId: dev2.id,
      testerId: tester.id,
      priority: Priority.CRITICAL,
      plannedStart: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      deadline: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      commitment: 4,
      commitmentUnit: 'HOURS',
      actualStart: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      actualEffort: 2,
      progress: 20,
      status: TaskStatus.IN_PROGRESS,
      startDelay: 2
    }
  })

  console.log('Tasks created')
  console.log('Seed completed successfully')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
