import { IsNotInTheFutureConstraint } from './is-not-in-the-future';

describe('IsNotInTheFutureConstraint', () => {
  const constraint = new IsNotInTheFutureConstraint();

  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-03T23:30:00.000Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('Accepts a date in the past', () => {
    expect(constraint.validate('2026-09-02')).toBe(true);
  });

  it('Accepts the current date', () => {
    expect(constraint.validate('2026-09-03')).toBe(true);
  });

  it('Accepts the current date of a user in a time zone ahead of the instance', () => {
    expect(constraint.validate('2026-09-04')).toBe(true);
  });

  it('Refuses a date in the future', () => {
    expect(constraint.validate('2026-09-05')).toBe(false);
  });

  it('Leaves a value which is not a string to IsISO8601', () => {
    expect(constraint.validate(undefined)).toBe(true);
    expect(constraint.validate(null)).toBe(true);
    expect(constraint.validate(123)).toBe(true);
  });
});
