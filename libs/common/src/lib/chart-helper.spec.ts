import { getTooltipOptions, getTrendColorRgb } from './chart-helper';

describe('getTooltipOptions', () => {
  const getLabel = ({
    currency,
    locale,
    unit,
    y
  }: {
    currency?: string;
    locale: string;
    unit?: string;
    y: number;
  }) => {
    const { callbacks } = getTooltipOptions({
      currency,
      locale,
      unit,
      colorScheme: 'LIGHT'
    });

    return (callbacks?.label as (context: unknown) => string)({
      dataset: { label: 'Performance' },
      parsed: { y, x: 0 }
    });
  };

  it('formats the value with the locale for a currency', () => {
    expect(getLabel({ currency: 'EUR', locale: 'en-US', y: 1234.5 })).toBe(
      'Performance: 1,234.50 EUR'
    );
  });

  it('formats the value with the locale for a unit', () => {
    expect(getLabel({ locale: 'fr', unit: '%', y: 0.86 })).toBe(
      'Performance: 0,86 %'
    );
  });

  it('formats the value with the locale and grouping for a unit', () => {
    expect(getLabel({ locale: 'de', unit: '%', y: 1234.5 })).toBe(
      'Performance: 1.234,50 %'
    );
  });

  it('formats the value with the locale without a unit', () => {
    expect(getLabel({ locale: 'de', y: 1234.5 })).toBe('Performance: 1.234,50');
  });
});

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
