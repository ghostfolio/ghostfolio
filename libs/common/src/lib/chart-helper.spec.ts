import { getBaselineAnnotation } from './chart-helper';

describe('getBaselineAnnotation', () => {
  it('returns a dashed horizontal line at the value', () => {
    expect(
      getBaselineAnnotation({ colorScheme: 'LIGHT', value: 0 })
    ).toMatchObject({
      borderDash: [4, 4],
      scaleID: 'y',
      type: 'line',
      value: 0
    });
  });
});
