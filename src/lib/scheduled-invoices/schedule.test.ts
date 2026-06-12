import test from 'node:test';
import assert from 'node:assert/strict';
import {
  effectiveDateForMonth,
  hasReachedEnd,
  monthKey,
  nextMonth,
  shouldExpireOccurrence,
} from './schedule.ts';

test('keeps an existing weekday date', () => {
  assert.equal(effectiveDateForMonth('2026-06-15', '2026-07'), '2026-07-15');
});

test('moves a weekend date to the previous Friday', () => {
  assert.equal(effectiveDateForMonth('2026-06-15', '2026-08'), '2026-08-14');
});

test('uses the last weekday when the model day does not exist', () => {
  assert.equal(effectiveDateForMonth('2026-01-31', '2026-02'), '2026-02-27');
});

test('calculates month keys and next months across years', () => {
  assert.equal(monthKey('2026-12-15'), '2026-12');
  assert.equal(nextMonth('2026-12'), '2027-01');
});

test('expires pending confirmation only after its calendar month', () => {
  assert.equal(shouldExpireOccurrence('2026-06', '2026-06-30'), false);
  assert.equal(shouldExpireOccurrence('2026-06', '2026-07-01'), true);
});

test('month limit counts processed months and invoice limit counts issued invoices', () => {
  assert.equal(hasReachedEnd('MONTHS', 3, 3, 0), true);
  assert.equal(hasReachedEnd('INVOICES', 3, 9, 2), false);
  assert.equal(hasReachedEnd('INVOICES', 3, 9, 3), true);
  assert.equal(hasReachedEnd('NONE', null, 99, 99), false);
});
