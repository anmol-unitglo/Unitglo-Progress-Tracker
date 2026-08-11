import { PrismaClient, TaskStatus, TestStatus, TestResult } from "@prisma/client";
import { getNow, calculateOverdue, getISTDate, startOfDayIST, endOfDayIST } from "@/utils/date";

const prisma = new PrismaClient();

export async function getDashboardSummary() {
  const [
    activeProjects,
    totalTasks,
    completedTasks,
    inProgressTasks,
    readyTestingTasks,
    testingTasks,
    reworkTasks,
    blockedTasks // Assuming blocked is tracked somehow, maybe a new status or just a flag. The prompt asked for 'Blocked'. If not in schema, we might need a workaround or just return 0.
  ] = await Promise.all([
    prisma.project.count({ where: { status: "ACTIVE" } }),
    prisma.task.count(),
    prisma.task.count({ where: { status: TaskStatus.COMPLETED } }),
    prisma.task.count({ where: { status: TaskStatus.IN_PROGRESS } }),
    prisma.task.count({ where: { status: TaskStatus.READY_FOR_TESTING } }),
    prisma.task.count({ where: { status: TaskStatus.TESTING } }),
    prisma.task.count({ where: { status: TaskStatus.REWORK_REQUIRED } }),
    0 // Placeholder for Blocked if not explicitly in enum
  ]);

  const allTasks = await prisma.task.findMany({
    select: { expectedDelivery: true, status: true, deliveryDelay: true, startDelay: true }
  });

  const now = getISTDate();
  let overdueTasks = 0;
  
  // Tasks due today/soon in IST
  const todayStart = startOfDayIST(now);
  const todayEnd = endOfDayIST(now);
  
  const soonEnd = endOfDayIST(new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000));

  let dueToday = 0;
  let dueSoon = 0;

  let totalDeliveryDelay = 0;
  let totalStartDelay = 0;
  let completedCountWithDelay = 0;
  let startedCountWithDelay = 0;

  for (const task of allTasks) {
    if (task.status !== TaskStatus.COMPLETED) {
      const overdue = calculateOverdue(task.expectedDelivery);
      if (overdue && overdue > 0) overdueTasks++;

      if (task.expectedDelivery && task.expectedDelivery >= todayStart && task.expectedDelivery <= todayEnd) {
        dueToday++;
      } else if (task.expectedDelivery && task.expectedDelivery > todayEnd && task.expectedDelivery <= soonEnd) {
        dueSoon++;
      }
    } else {
      if (task.deliveryDelay !== null) {
        totalDeliveryDelay += task.deliveryDelay;
        completedCountWithDelay++;
      }
    }

    if (task.startDelay !== null) {
      totalStartDelay += task.startDelay;
      startedCountWithDelay++;
    }
  }

  const avgDeliveryDelay = completedCountWithDelay > 0 ? (totalDeliveryDelay / completedCountWithDelay) : 0;
  const avgStartDelay = startedCountWithDelay > 0 ? (totalStartDelay / startedCountWithDelay) : 0;
  const onTimeCompletion = completedTasks > 0 ? ((completedTasks - allTasks.filter(t => t.status === TaskStatus.COMPLETED && t.deliveryDelay && t.deliveryDelay > 0).length) / completedTasks * 100) : 0;

  // Quality Metrics
  const [totalTests, passedTests, defectCount, retestCount] = await Promise.all([
    prisma.taskTesting.count(),
    prisma.taskTesting.count({ where: { testResult: TestResult.PASS } }),
    prisma.defect.count(),
    prisma.taskRetest.count()
  ]);

  const testingPassRate = totalTests > 0 ? (passedTests / totalTests * 100) : 0;
  
  // First pass success: tasks with COMPLETED status and exact 0 defects and 0 reworks
  const firstPassSuccessTasks = await prisma.task.count({
    where: { status: TaskStatus.COMPLETED, defectCount: 0, reworkCount: 0 }
  });
  const firstPassSuccessRate = completedTasks > 0 ? (firstPassSuccessTasks / completedTasks * 100) : 0;

  return {
    summary: { activeProjects, totalTasks, completedTasks, inProgressTasks, readyTestingTasks, testingTasks, reworkTasks, blockedTasks, overdueTasks },
    delivery: { dueToday, dueSoon, overdueTasks, avgStartDelay, avgDeliveryDelay, onTimeCompletion },
    quality: { testingPassRate, firstPassSuccessRate, defectCount, retestCount, reworkCount: reworkTasks }
  };
}

export async function getDynamicDeveloperPerformance(startDate?: Date, endDate?: Date) {
  const taskFilter: any = {};
  if (startDate || endDate) {
    taskFilter.createdAt = {};
    if (startDate) taskFilter.createdAt.gte = startDate;
    if (endDate) taskFilter.createdAt.lte = endDate;
  }

  const developers = await prisma.user.findMany({
    where: { role: "DEVELOPER" },
    include: {
      tasksDeveloper: {
        where: taskFilter,
        select: {
          id: true,
          status: true,
          progress: true,
          commitment: true,
          actualEffort: true,
          startDelay: true,
          deliveryDelay: true,
          effortVariance: true,
          estimationAccuracy: true,
          reworkCount: true,
          defectCount: true,
          expectedDelivery: true,
          testingStatus: true
        }
      }
    }
  });

  return developers.map(dev => {
    const devTasks = dev.tasksDeveloper || [];
    const totalTasks = devTasks.length;
    const completedTasks = devTasks.filter((t: any) => t.status === TaskStatus.COMPLETED);
    const completedCount = completedTasks.length;
    
    // Output
    const inProgressCount = devTasks.filter((t: any) => t.status === TaskStatus.IN_PROGRESS).length;
    const testingCount = devTasks.filter((t: any) => t.status === TaskStatus.READY_FOR_TESTING || t.status === TaskStatus.TESTING).length;
    
    // Progress avg
    const avgProgress = totalTasks > 0 ? (devTasks.reduce((sum: number, t: any) => sum + t.progress, 0) / totalTasks) : 0;
    
    // Effort sums
    const totalCommitment = devTasks.reduce((sum: number, t: any) => sum + t.commitment, 0);
    const totalActualEffort = devTasks.reduce((sum: number, t: any) => sum + (t.actualEffort || 0), 0);
    
    // Delivery Delays (Historical on completed only)
    const completedWithDelay = completedTasks.filter((t: any) => t.deliveryDelay !== null);
    const avgDeliveryDelay = completedWithDelay.length > 0 
      ? (completedWithDelay.reduce((sum: number, t: any) => sum + t.deliveryDelay!, 0) / completedWithDelay.length) 
      : 0;

    // Start delays (All tasks with a start delay)
    const tasksWithStartDelay = devTasks.filter((t: any) => t.startDelay !== null);
    const avgStartDelay = tasksWithStartDelay.length > 0
      ? (tasksWithStartDelay.reduce((sum: number, t: any) => sum + t.startDelay!, 0) / tasksWithStartDelay.length)
      : 0;

    // Quality
    const totalRework = devTasks.reduce((sum: number, t: any) => sum + t.reworkCount, 0);
    const firstPassCount = completedTasks.filter((t: any) => t.defectCount === 0 && t.reworkCount === 0).length;
    const firstPassSuccessRate = completedCount > 0 ? (firstPassCount / completedCount * 100) : 0;
    const onTimeCount = completedTasks.filter((t: any) => (t.deliveryDelay || 0) <= 0).length;
    const onTimeCompletionRate = completedCount > 0 ? (onTimeCount / completedCount * 100) : 0;
    
    // Estimation Accuracy (Average across all tasks with effort variance)
    const tasksWithAccuracy = devTasks.filter((t: any) => t.estimationAccuracy !== null);
    const avgEstimationAccuracy = tasksWithAccuracy.length > 0 
      ? (tasksWithAccuracy.reduce((sum: number, t: any) => sum + t.estimationAccuracy!, 0) / tasksWithAccuracy.length) 
      : 0;

    // Current Overdue (Incomplete tasks only)
    const overdueCount = devTasks.filter((t: any) => t.status !== TaskStatus.COMPLETED && calculateOverdue(t.expectedDelivery)! > 0).length;

    return {
      id: dev.id,
      name: dev.name,
      totalTasks,
      completed: completedCount,
      inProgress: inProgressCount,
      testing: testingCount,
      overdue: overdueCount,
      completionRate: totalTasks > 0 ? (completedCount / totalTasks * 100) : 0,
      avgProgress,
      totalCommitment,
      totalActualEffort,
      avgStartDelay,
      avgDeliveryDelay,
      avgEstimationAccuracy,
      totalRework,
      firstPassSuccessRate,
      onTimeCompletionRate
    };
  });
}

export async function getProjectPerformance() {
  const projects = await prisma.project.findMany({
    include: {
      tasks: {
        select: {
          status: true,
          progress: true,
          expectedDelivery: true,
          deliveryDelay: true,
          defectCount: true
        }
      }
    }
  });

  return projects.map(p => {
    const totalTasks = p.tasks.length;
    const completedTasks = p.tasks.filter(t => t.status === TaskStatus.COMPLETED).length;
    const avgProgress = totalTasks > 0 ? (p.tasks.reduce((sum, t) => sum + t.progress, 0) / totalTasks) : 0;
    
    const overdue = p.tasks.filter(t => t.status !== TaskStatus.COMPLETED && calculateOverdue(t.expectedDelivery)! > 0).length;
    const delayed = p.tasks.filter(t => t.status === TaskStatus.COMPLETED && t.deliveryDelay && t.deliveryDelay > 0).length;
    
    const testingCount = p.tasks.filter((t: any) => t.status === TaskStatus.READY_FOR_TESTING || t.status === TaskStatus.TESTING).length;
    const totalDefects = p.tasks.reduce((sum: number, t: any) => sum + t.defectCount, 0);

    return {
      id: p.id,
      code: p.code,
      name: p.name,
      status: p.status,
      progress: avgProgress,
      totalTasks,
      completedTasks,
      overdue,
      delayed,
      testing: testingCount,
      totalDefects
    };
  });
}
