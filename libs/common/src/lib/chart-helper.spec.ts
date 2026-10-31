import { getBaselineAnnotation, getTooltipOptions } from './chart-helper';

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
