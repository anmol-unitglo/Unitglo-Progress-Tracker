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
// DEVELOPER ACTIONS
// ------------------------------------------------------------------

export async function createDeveloperTask(developerId: number, data: any) {
  // Ensure the developer only creates tasks for themselves
  const { projectId, module, title, description, assignedById, plannedStart, deadline, commitment, commitmentUnit, priority } = data;

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
