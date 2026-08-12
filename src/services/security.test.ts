import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { PrismaClient, TaskStatus, Role, Priority, TimeUnit } from '@prisma/client';
import { cancelTask, reassignTask, updateTaskPlanning } from './taskService';

// Mock next-auth to simulate CEO session
vi.mock('next-auth', () => ({
  default: vi.fn(),
  getServerSession: vi.fn(() => Promise.resolve({
    user: { id: '999', role: 'CEO', name: 'CEO' }
  }))
}));

import { actionUpdateUser } from '../app/actions/userActions';

const prisma = new PrismaClient();

describe('V1.1 Security and Integrity', () => {
  let pmAId: number, pmBId: number, devId: number, testerId: number, projectAId: number, projectBId: number, taskBId: number;
  let ceoId: number;

  beforeAll(async () => {
    // Setup test users
    const pmA = await prisma.user.create({ data: { name: 'PM A', email: 'pma@test.com', role: Role.PM, password: 'hash' } });
    const pmB = await prisma.user.create({ data: { name: 'PM B', email: 'pmb@test.com', role: Role.PM, password: 'hash' } });
    const dev = await prisma.user.create({ data: { name: 'Dev', email: 'dev@test.com', role: Role.DEVELOPER, password: 'hash' } });
    const tester = await prisma.user.create({ data: { name: 'Tester', email: 'tester@test.com', role: Role.TESTER, password: 'hash' } });
    const ceo = await prisma.user.create({ data: { id: 999, name: 'CEO', email: 'ceo_sec@test.com', role: Role.CEO, password: 'hash' } });

    pmAId = pmA.id; pmBId = pmB.id; devId = dev.id; testerId = tester.id; ceoId = ceo.id;

    // Setup projects
    const projA = await prisma.project.create({ data: { name: 'Project A', code: 'PRA', description: 'Desc', createdById: pmAId } });
    const projB = await prisma.project.create({ data: { name: 'Project B', code: 'PRB', description: 'Desc', createdById: pmBId } });
    projectAId = projA.id; projectBId = projB.id;

    // Memberships
    await prisma.projectMember.create({ data: { projectId: projectAId, userId: pmAId, role: Role.PM } });
    await prisma.projectMember.create({ data: { projectId: projectBId, userId: pmBId, role: Role.PM } });
    await prisma.projectMember.create({ data: { projectId: projectBId, userId: devId, role: Role.DEVELOPER } });
    await prisma.projectMember.create({ data: { projectId: projectBId, userId: testerId, role: Role.TESTER } });

    // Task for PM B
    const taskB = await prisma.task.create({
      data: {
        projectId: projectBId,
        module: 'M1',
        title: 'Task B',
        assignedById: pmBId,
        developerId: devId,
        testerId: testerId,
        plannedStart: new Date(),
        deadline: new Date(),
        commitment: 10,
        commitmentUnit: TimeUnit.HOURS,
        expectedDelivery: new Date(),
        status: TaskStatus.NOT_STARTED,
        priority: Priority.MEDIUM
      }
    });
    taskBId = taskB.id;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.task.deleteMany({ where: { projectId: { in: [projectAId, projectBId] } } });
    await prisma.projectMember.deleteMany({ where: { projectId: { in: [projectAId, projectBId] } } });
    await prisma.project.deleteMany({ where: { id: { in: [projectAId, projectBId] } } });
    await prisma.user.deleteMany({ where: { id: { in: [pmAId, pmBId, devId, testerId, ceoId] } } });
  });

  it('PM IDOR - PM A cannot cancel Task B', async () => {
    await expect(cancelTask(pmAId, taskBId)).rejects.toThrow(/Forbidden/);
  });

  it('PM IDOR - PM B can cancel Task B', async () => {
    const task = await cancelTask(pmBId, taskBId);
    expect(task.status).toBe(TaskStatus.CANCELLED);
  });

  it('Role Integrity - Cannot change Dev to PM if active tasks exist', async () => {
    // Recreate an active task for Dev
    const task = await prisma.task.create({
      data: {
        projectId: projectBId, module: 'M2', title: 'Task Active', assignedById: pmBId,
        developerId: devId, plannedStart: new Date(), deadline: new Date(), commitment: 10,
        commitmentUnit: TimeUnit.HOURS, expectedDelivery: new Date(), status: TaskStatus.IN_PROGRESS,
        priority: Priority.MEDIUM
      }
    });

    const formData = new FormData();
    formData.append('userId', devId.toString());
    formData.append('name', 'Dev');
    formData.append('email', 'dev@test.com');
    formData.append('role', 'PM');

    const result = await actionUpdateUser(null, formData);
    expect(result.error).toMatch(/Cannot change role. User is assigned as Developer/);

    await prisma.task.delete({ where: { id: task.id } });
  });
});
