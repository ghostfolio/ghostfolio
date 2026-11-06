import { differenceInAccountingDays } from './accounting-days';

describe('ROAI accounting-day weighting', () => {
  it('counts one day across the autumn daylight-saving transition', () => {
    expect(differenceInAccountingDays('2024-10-28', '2024-10-27')).toBe(1);
  });

  it('counts one day across the spring daylight-saving transition', () => {
    expect(differenceInAccountingDays('2024-04-01', '2024-03-31')).toBe(1);
  });

  it('counts 366 days across the leap year 2024', () => {
    expect(differenceInAccountingDays('2024-12-31', '2023-12-31')).toBe(366);
  });

  it('counts days before the Unix epoch', () => {
    expect(differenceInAccountingDays('1969-12-31', '1969-12-30')).toBe(1);
  });

  it('counts days across the Unix epoch', () => {
    expect(differenceInAccountingDays('1970-01-01', '1969-12-31')).toBe(1);
  });

  it('preserves years before 100 CE', () => {
    expect(differenceInAccountingDays('0099-01-02', '0099-01-01')).toBe(1);
  });

  it('returns zero for the same accounting date', () => {
    expect(differenceInAccountingDays('2024-10-27', '2024-10-27')).toBe(0);
  });

  it('preserves the sign for reversed accounting dates', () => {
    expect(differenceInAccountingDays('2024-10-27', '2024-10-28')).toBe(-1);
  });
});
