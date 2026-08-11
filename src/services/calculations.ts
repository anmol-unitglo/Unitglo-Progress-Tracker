export function calculateExpectedDelivery(plannedStart: Date, commitment: number, commitmentUnit: 'HOURS' | 'DAYS'): Date {
  // Simple calculation assuming commitment is direct addition.
  // In a real app, we'd account for working hours (8 per day) and weekends.
  // Requirement: Treat 1 working day as 8 working hours. No holiday/calendar engine yet.
  
  const expectedDate = new Date(plannedStart.getTime());
  let hoursToAdd = commitment;
  if (commitmentUnit === 'DAYS') {
    hoursToAdd = commitment * 8; // 8 hours per day
  }
  
  // Just add the hours directly to planned start for MVP
  expectedDate.setHours(expectedDate.getHours() + hoursToAdd);
  return expectedDate;
}

export function calculateStartDelay(plannedStart: Date, actualStart: Date): number {
  const diffTime = actualStart.getTime() - plannedStart.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  return Number(diffDays.toFixed(2));
}

export function calculateDeliveryDelay(expectedDelivery: Date, actualCompletion: Date): number {
  const diffTime = actualCompletion.getTime() - expectedDelivery.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  return Number(diffDays.toFixed(2));
}

export function calculateEffortVariance(actualEffort: number, commitment: number, commitmentUnit: 'HOURS' | 'DAYS'): number {
  const commitmentHours = commitmentUnit === 'DAYS' ? commitment * 8 : commitment;
  return actualEffort - commitmentHours; // Positive means over effort, negative means under effort
}

export function calculateEstimationAccuracy(actualEffort: number, commitment: number, commitmentUnit: 'HOURS' | 'DAYS'): number {
  const commitmentHours = commitmentUnit === 'DAYS' ? commitment * 8 : commitment;
  if (actualEffort === 0) return 100; // Prevent division by zero if somehow actual effort is 0 but completed
  const ratio = commitmentHours / actualEffort;
  // If ratio > 1, they finished faster (could cap at 100% or just return the ratio). 
  // Let's cap at 100% and reduce for under/over estimation if needed.
  // Actually, standard accuracy: min(commitment/actual, actual/commitment) * 100
  const accuracy = ratio > 1 ? (1 / ratio) * 100 : ratio * 100;
  return Number(accuracy.toFixed(2));
}

export function calculateFirstPassSuccess(tasks: { reworkCount: number, status: string }[]): number {
  if (tasks.length === 0) return 0;
  
  const completedTasks = tasks.filter(t => t.status === 'COMPLETED');
  if (completedTasks.length === 0) return 0;

  const passedFirstTime = completedTasks.filter(t => t.reworkCount === 0).length;
  return Number(((passedFirstTime / completedTasks.length) * 100).toFixed(2));
}
