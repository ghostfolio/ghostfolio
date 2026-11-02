import { IsValidDateRangeConstraint } from './is-valid-date-range';

describe('IsValidDateRangeConstraint', () => {
  const constraint = new IsValidDateRangeConstraint();

  it('Refuses a value which is not a string', () => {
    expect(constraint.validate(undefined)).toBe(false);
    expect(constraint.validate(null)).toBe(false);
    expect(constraint.validate(2024)).toBe(false);
    expect(constraint.validate(['2024', '2025'])).toBe(false);
  });
});
