import type { ScheduleEndType } from './types';

export function monthKey(date: string): string {
  return date.slice(0, 7);
}

export function nextMonth(month: string): string {
  const [year, value] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, value, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function effectiveDateForMonth(firstDate: string, month: string): string {
  const modelDay = Number(firstDate.slice(8, 10));
  const [year, monthNumber] = month.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const day = Math.min(modelDay, lastDay);
  const result = new Date(Date.UTC(year, monthNumber - 1, day));

  if (result.getUTCDay() === 6) result.setUTCDate(result.getUTCDate() - 1);
  if (result.getUTCDay() === 0) result.setUTCDate(result.getUTCDate() - 2);

  return result.toISOString().slice(0, 10);
}

export function shouldExpireOccurrence(occurrenceMonth: string, today: string): boolean {
  return occurrenceMonth < monthKey(today);
}

export function hasReachedEnd(
  endType: ScheduleEndType,
  endValue: number | null,
  processedMonths: number,
  issuedCount: number,
): boolean {
  if (endType === 'NONE' || endValue == null) return false;
  return endType === 'MONTHS'
    ? processedMonths >= endValue
    : issuedCount >= endValue;
}

