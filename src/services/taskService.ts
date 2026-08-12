import { PrismaClient, TaskStatus, TestStatus, TestResult, Priority, DefectStatus, TimeUnit, Role } from '@prisma/client';
import {
  calculateExpectedDelivery,
  calculateStartDelay,
  calculateDeliveryDelay,
  calculateEffortVariance,
  calculateEstimationAccuracy
} from './calculations';

const prisma = new PrismaClient();

// Helper to log activity
async function logActivity(userId: number, action: string, entityType: string, entityId: number, taskId?: number, metadata?: any) {
  await prisma.activityLog.create({
    data: {
      userId,
      action,
      entityType,
      entityId,
      taskId,
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  });
}

// ------------------------------------------------------------------
// PM ACTIONS
// ------------------------------------------------------------------

export async function createPMTask(pmId: number, data: any) {
  const { projectId, developerId, module, title, description, plannedStart, deadline, commitment, commitmentUnit, priority } = data;

  // Authorization: Must belong to the project as a PM
  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId: parseInt(projectId), userId: pmId } }
  });
  if (!membership || membership.role !== "PM") throw new Error("Unauthorized to create tasks for this project");

  // Authorization: Developer must belong to the project
  const devMembership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId: parseInt(projectId), userId: parseInt(developerId) } }
  });
  if (!devMembership || devMembership.role !== "DEVELOPER") throw new Error("Assigned user is not a developer on this project");

  // Calculate Expected Delivery
  const expectedDelivery = calculateExpectedDelivery(new Date(plannedStart), commitment, commitmentUnit);

  const task = await prisma.task.create({
    data: {
      projectId: parseInt(projectId),
      module,
      title,
      description,
      priority: priority || Priority.MEDIUM,
      assignedById: pmId, // Forced server-side
      developerId: parseInt(developerId), 
      plannedStart: new Date(plannedStart),
      deadline: new Date(deadline),
      commitment: parseFloat(commitment),
      commitmentUnit: commitmentUnit || TimeUnit.HOURS,
      expectedDelivery,
      status: TaskStatus.NOT_STARTED,
    },
  });

  await logActivity(pmId, 'TASK_CREATED_BY_PM', 'TASK', task.id, task.id, { title });
  return task;
}

// ------------------------------------------------------------------
// DEVELOPER ACTIONS
// ------------------------------------------------------------------

export async function createDeveloperTask(developerId: number, data: any) {
  // Ensure the developer only creates tasks for themselves
  const { projectId, module, title, description, assignedById, plannedStart, deadline, commitment, commitmentUnit, priority } = data;

  // Authorization: Developer must belong to the selected project
  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId: parseInt(projectId), userId: developerId } }
  });
  if (!membership || membership.role !== "DEVELOPER") throw new Error("Unauthorized: You are not a developer on this project");

  // Calculate Expected Delivery
  const expectedDelivery = calculateExpectedDelivery(new Date(plannedStart), commitment, commitmentUnit);

  const task = await prisma.task.create({
    data: {
      projectId: parseInt(projectId),
      module,
      title,
      description,
      priority: priority || Priority.MEDIUM,
      assignedById: parseInt(assignedById),
      developerId, // Forced server-side
      plannedStart: new Date(plannedStart),
      deadline: new Date(deadline),
      commitment: parseFloat(commitment),
      commitmentUnit: commitmentUnit || TimeUnit.HOURS,
      expectedDelivery,
      status: TaskStatus.NOT_STARTED,
    },
  });

  await logActivity(developerId, 'TASK_CREATED', 'TASK', task.id, task.id, { title });
  return task;
}

export async function updateDeveloperTaskProgress(developerId: number, taskId: number, data: any) {
  // Authorization: Must belong to the developer
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) throw new Error('Task not found');
  if (task.developerId !== developerId) throw new Error('Unauthorized');
  
  if (task.status === TaskStatus.COMPLETED) {
    throw new Error('Cannot update a completed task');
  }

  const { progress, status, actualStart, actualEffort, remarks } = data;
  
  let newStatus = status;
  // Developers cannot mark tasks as COMPLETED directly.
  if (newStatus === TaskStatus.COMPLETED) {
    newStatus = TaskStatus.READY_FOR_TESTING;
  }
  
  // Transition logic check (e.g., cannot go from NOT_STARTED to READY_FOR_TESTING without actual effort/start, etc)
  
  const updateData: any = {
    progress: parseInt(progress),
    status: newStatus,
    actualEffort: parseFloat(actualEffort),
  };

  if (actualStart && !task.actualStart) {
    updateData.actualStart = new Date(actualStart);
    updateData.startDelay = calculateStartDelay(task.plannedStart!, new Date(actualStart));
  }
  
  // Calculate running metrics
  if (updateData.actualEffort && task.commitment) {
    updateData.effortVariance = calculateEffortVariance(updateData.actualEffort, task.commitment, task.commitmentUnit);
    updateData.estimationAccuracy = calculateEstimationAccuracy(updateData.actualEffort, task.commitment, task.commitmentUnit);
  }

  const updatedTask = await prisma.$transaction(async (tx) => {
    const t = await tx.task.update({
      where: { id: taskId },
      data: updateData,
    });

    await tx.taskUpdate.create({
      data: {
        taskId,
        progress: updateData.progress,
        status: updateData.status,
        actualEffort: updateData.actualEffort,
        remarks,
        updatedById: developerId,
      }
    });

    return t;
  });

  await logActivity(developerId, 'TASK_UPDATED', 'TASK', taskId, taskId, { progress, status: newStatus });
  return updatedTask;
}

export async function submitTaskForTesting(developerId: number, taskId: number) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task || task.developerId !== developerId) throw new Error('Unauthorized');
  
  if (task.status !== TaskStatus.IN_PROGRESS && task.status !== TaskStatus.REWORK_REQUIRED) {
    throw new Error('Invalid status transition');
  }

  const updatedTask = await prisma.task.update({
    where: { id: taskId },
    data: { status: TaskStatus.READY_FOR_TESTING }
  });

  await logActivity(developerId, 'SUBMITTED_FOR_TESTING', 'TASK', taskId, taskId);
  return updatedTask;
}

// ------------------------------------------------------------------
// TESTER ACTIONS
// ------------------------------------------------------------------

export async function startTaskTesting(testerId: number, taskId: number) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task || task.status !== TaskStatus.READY_FOR_TESTING) throw new Error('Invalid status transition');

  const updatedTask = await prisma.task.update({
    where: { id: taskId },
    data: { 
      status: TaskStatus.TESTING,
      testingStatus: TestStatus.TESTING,
      testerId: testerId, // Assign to this tester
    }
  });

  await logActivity(testerId, 'TESTING_STARTED', 'TASK', taskId, taskId);
  return updatedTask;
}

export async function passTaskTesting(testerId: number, taskId: number, remarks?: string) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task || task.status !== TaskStatus.TESTING) throw new Error('Invalid status transition');
  if (task.testerId !== testerId) throw new Error('Unauthorized: Not your task');

  const actualCompletion = new Date();
  const deliveryDelay = calculateDeliveryDelay(task.expectedDelivery!, actualCompletion);

  await prisma.$transaction(async (tx) => {
    // 1. Record test
    await tx.taskTesting.create({
      data: {
        taskId,
        testerId,
        testingStatus: TestStatus.PASSED,
        testResult: TestResult.PASS,
        remarks,
      }
    });

    // 2. Update task
    await tx.task.update({
      where: { id: taskId },
      data: {
        status: TaskStatus.COMPLETED,
        testingStatus: TestStatus.PASSED,
        actualCompletion,
        deliveryDelay,
        progress: 100
      }
    });
  });

  await logActivity(testerId, 'TESTING_PASSED', 'TASK', taskId, taskId);
}

export async function failTaskTestingAndCreateDefect(testerId: number, taskId: number, defectData: any) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task || task.status !== TaskStatus.TESTING) throw new Error('Invalid status transition');
  if (task.testerId !== testerId) throw new Error('Unauthorized: Not your task');

  await prisma.$transaction(async (tx) => {
    await tx.taskTesting.create({
      data: {
        taskId,
        testerId,
        testingStatus: TestStatus.FAILED,
        testResult: TestResult.FAIL,
        remarks: defectData.remarks,
      }
    });

    await tx.defect.create({
      data: {
        taskId,
        description: defectData.description,
        severity: defectData.severity || Priority.MEDIUM,
        status: DefectStatus.OPEN,
        createdById: testerId,
      }
    });

    await tx.task.update({
      where: { id: taskId },
      data: {
        status: TaskStatus.REWORK_REQUIRED,
        testingStatus: TestStatus.FAILED,
        defectCount: { increment: 1 },
        reworkCount: { increment: 1 },
      }
    });
  });

  await logActivity(testerId, 'TESTING_FAILED_WITH_DEFECT', 'TASK', taskId, taskId);
}

export async function recordRetest(testerId: number, taskId: number, result: TestResult, remarks?: string) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task || task.status !== TaskStatus.TESTING) throw new Error('Invalid status transition for retest');
  if (task.testerId !== testerId) throw new Error('Unauthorized: Not your task');

  await prisma.$transaction(async (tx) => {
    await tx.taskRetest.create({
      data: {
        taskId,
        testerId,
        result,
        remarks
      }
    });

    if (result === TestResult.PASS) {
      const actualCompletion = new Date();
      await tx.task.update({
        where: { id: taskId },
        data: {
          status: TaskStatus.COMPLETED,
          testingStatus: TestStatus.PASSED,
          actualCompletion,
          deliveryDelay: calculateDeliveryDelay(task.expectedDelivery!, actualCompletion),
          progress: 100,
          retestCount: { increment: 1 }
        }
      });
    } else {
      await tx.task.update({
        where: { id: taskId },
        data: {
          status: TaskStatus.REWORK_REQUIRED,
          testingStatus: TestStatus.FAILED,
          reworkCount: { increment: 1 },
          retestCount: { increment: 1 }
        }
      });
    }
  });

  await logActivity(testerId, `RETEST_${result}`, 'TASK', taskId, taskId);
}

// ------------------------------------------------------------------
// PM ACTIONS (V1.1 Admin Features)
// ------------------------------------------------------------------

async function verifyPMAuthorization(pmId: number, projectId: number) {
  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: pmId } }
  });
  if (!membership || membership.role !== "PM") {
    throw new Error("Forbidden. You are not an authorized PM for this project.");
  }
}

export async function cancelTask(pmId: number, taskId: number) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) throw new Error('Task not found');
  await verifyPMAuthorization(pmId, task.projectId);

  if (task.status !== TaskStatus.NOT_STARTED && task.status !== TaskStatus.BLOCKED) {
    throw new Error('Task can only be cancelled if it is NOT_STARTED or BLOCKED.');
  }

  const updatedTask = await prisma.task.update({
    where: { id: taskId },
    data: { status: TaskStatus.CANCELLED }
  });

  await logActivity(pmId, 'TASK_CANCELLED', 'TASK', taskId, taskId, { previousStatus: task.status });
  return updatedTask;
}

export async function reassignTask(pmId: number, taskId: number, role: 'DEVELOPER' | 'TESTER', newUserId: number) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) throw new Error('Task not found');
  await verifyPMAuthorization(pmId, task.projectId);

  const newUser = await prisma.user.findUnique({ where: { id: newUserId } });
  if (!newUser || newUser.role !== role || !newUser.isActive) {
    throw new Error(`Invalid user or incorrect role for reassignment.`);
  }

  const projectMember = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId: task.projectId, userId: newUserId } }
  });
  if (!projectMember) {
    throw new Error('User is not a member of this project.');
  }

  let updateData: any = {};
  let previousId: number | null = null;

  if (role === 'DEVELOPER') {
    if (task.status !== TaskStatus.NOT_STARTED && task.status !== TaskStatus.BLOCKED) {
      throw new Error('Developer reassignment allowed only when NOT_STARTED or BLOCKED.');
    }
    previousId = task.developerId;
    updateData = { developerId: newUserId };
  } else if (role === 'TESTER') {
    if (task.status !== TaskStatus.NOT_STARTED && task.status !== TaskStatus.BLOCKED && task.status !== TaskStatus.READY_FOR_TESTING) {
      throw new Error('Tester reassignment allowed only when NOT_STARTED, BLOCKED, or READY_FOR_TESTING.');
    }
    previousId = task.testerId;
    updateData = { testerId: newUserId };
  }

  const updatedTask = await prisma.task.update({
    where: { id: taskId },
    data: updateData
  });

  await logActivity(pmId, 'TASK_REASSIGNED', 'TASK', taskId, taskId, {
    role,
    previousUserId: previousId,
    newUserId: newUserId,
    pmId
  });

  return updatedTask;
}

export async function updateTaskPlanning(pmId: number, taskId: number, data: any) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) throw new Error('Task not found');
  await verifyPMAuthorization(pmId, task.projectId);

  if (task.actualStart) {
    throw new Error('Cannot edit planning fields after actual work has started.');
  }

  const { title, description, priority, commitment, commitmentUnit, developerId, testerId } = data;

  if (developerId) {
    const dev = await prisma.projectMember.findFirst({ where: { projectId: task.projectId, userId: parseInt(developerId), role: 'DEVELOPER' } });
    if (!dev) throw new Error('Invalid developer assignment.');
  }
  
  if (testerId) {
    const tester = await prisma.projectMember.findFirst({ where: { projectId: task.projectId, userId: parseInt(testerId), role: 'TESTER' } });
    if (!tester) throw new Error('Invalid tester assignment.');
  }

  const updatedTask = await prisma.task.update({
    where: { id: taskId },
    data: {
      title: title || task.title,
      description: description !== undefined ? description : task.description,
      priority: priority || task.priority,
      commitment: commitment ? parseFloat(commitment) : task.commitment,
      commitmentUnit: commitmentUnit || task.commitmentUnit,
      developerId: developerId ? parseInt(developerId) : task.developerId,
      testerId: testerId ? parseInt(testerId) : task.testerId,
    }
  });

  await logActivity(pmId, 'TASK_PLANNING_UPDATED', 'TASK', taskId, taskId, { pmId });
  return updatedTask;
}
