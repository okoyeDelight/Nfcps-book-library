import test from 'node:test';
import assert from 'node:assert/strict';
import { taskPlan } from '../src/main.js';

test('5-minute scheduler gates jobs without duplicate cadences', () => {
  assert.deepEqual(taskPlan(new Date('2026-09-12T12:00:00Z')), {
    moments: true,
    'watch-refresh': true,
    circulation: true,
  });
  assert.deepEqual(taskPlan(new Date('2026-09-12T12:05:00Z')), {
    moments: true,
    'watch-refresh': false,
    circulation: false,
  });
  assert.deepEqual(taskPlan(new Date('2026-09-12T12:10:00Z')), {
    moments: true,
    'watch-refresh': true,
    circulation: false,
  });
});
