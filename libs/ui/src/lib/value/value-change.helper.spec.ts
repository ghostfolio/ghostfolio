import { getValueChangeDirection } from './value-change.helper';

describe('getValueChangeDirection', () => {
  it('detects an increase', () => {
    expect(
      getValueChangeDirection({
        currentValue: 101,
        digits: 2,
        previousValue: 100
      })
    ).toBe('up');
  });

  it('detects a decrease', () => {
    expect(
      getValueChangeDirection({
        currentValue: 99.5,
        digits: 2,
        previousValue: 100
      })
    ).toBe('down');
  });

  it('ignores changes below the displayed precision', () => {
    expect(
      getValueChangeDirection({
        currentValue: 100.001,
        digits: 2,
        previousValue: 100
      })
    ).toBeUndefined();
  });

  it('ignores values which are not finite numbers', () => {
    expect(
      getValueChangeDirection({
        currentValue: NaN,
        digits: 2,
        previousValue: 100
      })
    ).toBeUndefined();

    expect(
      getValueChangeDirection({
        currentValue: '101',
        digits: 2,
        previousValue: 100
      })
    ).toBeUndefined();
  });
});
