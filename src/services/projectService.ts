import { PrismaClient, ProjectStatus, Role } from "@prisma/client";

const prisma = new PrismaClient();

// Helper to log activity
async function logActivity(userId: number, action: string, entityType: string, entityId: number, metadata?: any) {
  await prisma.activityLog.create({
    data: {
      userId,
      action,
      entityType,
      entityId,
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  });
}

export async function createProject(pmId: number, data: any) {
  const { code, name, description, priority, startDate, expectedEndDate } = data;

  const project = await prisma.project.create({
    data: {
      code,
      name,
      description,
      priority,
      status: ProjectStatus.PLANNING,
      createdById: pmId,
      startDate: startDate ? new Date(startDate) : null,
      expectedEndDate: expectedEndDate ? new Date(expectedEndDate) : null,
    }
  });

  await logActivity(pmId, 'PROJECT_CREATED', 'PROJECT', project.id, { name: project.name });
  return project;
}

export async function updateProject(pmId: number, projectId: number, data: any) {
  const { status, name, description, priority, startDate, expectedEndDate } = data;

  const project = await prisma.project.update({
    where: { id: projectId },
    data: {
      name,
      description,
      status,
      priority,
      startDate: startDate ? new Date(startDate) : null,
      expectedEndDate: expectedEndDate ? new Date(expectedEndDate) : null,
    }
  });

  await logActivity(pmId, 'PROJECT_UPDATED', 'PROJECT', project.id, { status: project.status });
  return project;
}

export async function assignProjectMembers(pmId: number, projectId: number, userIds: number[]) {
  // 1. Verify PM
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new Error("Project not found");

  // 2. Validate Users are active and valid roles
  const users = await prisma.user.findMany({
    where: { 
      id: { in: userIds },
      role: { in: ["DEVELOPER", "TESTER"] }
    }
  });

  if (users.length !== userIds.length) {
    throw new Error("One or more users are invalid or not developers/testers.");
  }

  await prisma.$transaction(async (tx) => {
    for (const user of users) {
      await tx.projectMember.upsert({
        where: {
          projectId_userId: { projectId, userId: user.id }
        },
        create: {
          projectId,
          userId: user.id,
          role: user.role
        },
        update: {} // Do nothing if already assigned
      });
    }
  });

  await logActivity(pmId, 'PROJECT_MEMBERS_ASSIGNED', 'PROJECT', projectId, { userIds });
}

export async function removeProjectMember(pmId: number, projectId: number, userId: number) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new Error("Project not found");

  await prisma.projectMember.delete({
    where: {
      projectId_userId: { projectId, userId }
    }
  });

  await logActivity(pmId, 'PROJECT_MEMBER_REMOVED', 'PROJECT', projectId, { userId });
}
