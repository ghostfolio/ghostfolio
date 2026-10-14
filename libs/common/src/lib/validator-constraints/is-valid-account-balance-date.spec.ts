import { IsValidAccountBalanceDateConstraint } from './is-valid-account-balance-date';

describe('IsValidAccountBalanceDateConstraint', () => {
  const constraint = new IsValidAccountBalanceDateConstraint();

  it('Leaves a value which is not a string to IsISO8601', () => {
    expect(constraint.validate(undefined)).toBe(true);
    expect(constraint.validate(null)).toBe(true);
    expect(constraint.validate(123)).toBe(true);
  });
});
