import { getTrendColorRgb } from './chart-helper';

describe('getTrendColorRgb', () => {
  it('returns green for a gain and red for a loss', () => {
    const green = getTrendColorRgb({ reference: 0, values: [0, 1, 2] });
    const red = getTrendColorRgb({ reference: 0, values: [0, 1, -0.5, null] });

    expect(green).toBe('40, 167, 69');
    expect(red).toBe('220, 53, 69');
  });

  it('compares with the first value without a reference', () => {
    expect(getTrendColorRgb({ values: [100, 120, 90] })).toBe('220, 53, 69');
    expect(getTrendColorRgb({ values: [100, 80, 110] })).toBe('40, 167, 69');
  });
});
