import test from 'node:test';
import assert from 'node:assert';
import {
  calculateExpectedDelivery,
  calculateStartDelay,
  calculateDeliveryDelay,
  calculateEffortVariance,
  calculateEstimationAccuracy,
  calculateFirstPassSuccess
} from './calculations';

test('Calculations Service - Expected Delivery', () => {
  const start = new Date('2023-01-01T10:00:00Z');
  let expected = calculateExpectedDelivery(start, 4, 'HOURS');
  assert.strictEqual(expected.getTime(), new Date('2023-01-01T14:00:00Z').getTime());

  expected = calculateExpectedDelivery(start, 2, 'DAYS');
  assert.strictEqual(expected.getTime(), new Date('2023-01-02T02:00:00Z').getTime());
});

test('Calculations Service - Start Delay', () => {
  const planned = new Date('2023-01-01T00:00:00Z');
  
  assert.strictEqual(calculateStartDelay(planned, planned), 0);
  assert.strictEqual(calculateStartDelay(planned, new Date('2022-12-31T00:00:00Z')), 0);
  assert.strictEqual(calculateStartDelay(planned, new Date('2023-01-03T00:00:00Z')), 2);
  assert.strictEqual(calculateStartDelay(planned, new Date('2023-01-01T12:00:00Z')), 0.5);
});

test('Calculations Service - Delivery Delay', () => {
  const expected = new Date('2023-01-05T00:00:00Z');
  
  assert.strictEqual(calculateDeliveryDelay(expected, expected), 0);
  assert.strictEqual(calculateDeliveryDelay(expected, new Date('2023-01-06T00:00:00Z')), 1);
});

test('Calculations Service - Effort Variance', () => {
  assert.strictEqual(calculateEffortVariance(10, 8, 'HOURS'), 2);
  assert.strictEqual(calculateEffortVariance(6, 1, 'DAYS'), -2);
});

test('Calculations Service - Estimation Accuracy', () => {
  assert.strictEqual(calculateEstimationAccuracy(8, 8, 'HOURS'), 100);
  assert.strictEqual(calculateEstimationAccuracy(8, 10, 'HOURS'), 80);
  assert.strictEqual(calculateEstimationAccuracy(10, 8, 'HOURS'), 80);
});

test('Calculations Service - First-Pass Testing Success', () => {
  const tasks = [
    { status: 'COMPLETED', reworkCount: 0 },
    { status: 'COMPLETED', reworkCount: 1 },
    { status: 'COMPLETED', reworkCount: 0 },
    { status: 'IN_PROGRESS', reworkCount: 0 }
  ];
  
  assert.strictEqual(calculateFirstPassSuccess(tasks), 66.67);
});
