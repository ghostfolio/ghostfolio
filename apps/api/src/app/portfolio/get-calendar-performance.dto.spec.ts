import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import 'reflect-metadata';

import { GetCalendarPerformanceDto } from './get-calendar-performance.dto';

describe('Calendar performance request validation', () => {
  const validate = (periods: unknown) =>
    validateSync(plainToInstance(GetCalendarPerformanceDto, { periods }));

  it('accepts periods across month and year boundaries', () => {
    expect(
      validate([
        { startDate: '2025-12-29', endDate: '2026-01-04' },
        { startDate: '2026-02-01', endDate: '2026-02-28' }
      ])
    ).toHaveLength(0);
  });

  it('rejects a missing or empty batch', () => {
    expect(validate(undefined).length).toBeGreaterThan(0);
    expect(validate([]).length).toBeGreaterThan(0);
  });

  it('rejects more than 55 periods', () => {
    const period = { startDate: '2026-01-01', endDate: '2026-01-02' };
    expect(
      validate(Array.from({ length: 56 }, () => period)).length
    ).toBeGreaterThan(0);
  });

  it('rejects malformed dates and nested objects', () => {
    expect(
      validate([{ startDate: 'invalid', endDate: '2026-01-02' }]).length
    ).toBeGreaterThan(0);
    expect(validate([null]).length).toBeGreaterThan(0);
  });
});
