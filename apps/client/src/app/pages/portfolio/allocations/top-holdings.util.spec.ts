import {
  isSameTopHoldingName,
  normalizeTopHoldingName
} from './top-holdings.util';

describe('Top Holdings Utility', () => {
  it('normalizes top holding names case-insensitively', () => {
    expect(normalizeTopHoldingName('NVIDIA Corp')).toEqual('nvidia corp');
    expect(normalizeTopHoldingName('NVIDIA CORP')).toEqual('nvidia corp');
  });

  it('matches top holding names case-insensitively', () => {
    expect(isSameTopHoldingName('NVIDIA Corp', 'NVIDIA CORP')).toBe(true);
    expect(isSameTopHoldingName('Apple Inc', 'Microsoft Corp')).toBe(false);
  });

  it('supports aggregation of mixed-case holding names into one entry', () => {
    const holdings = [
      { name: 'NVIDIA Corp', valueInBaseCurrency: 50 },
      { name: 'NVIDIA CORP', valueInBaseCurrency: 40 }
    ];
    const topHoldingsMap: Record<string, { name: string; value: number }> = {};

    for (const { name, valueInBaseCurrency } of holdings) {
      const topHoldingKey = normalizeTopHoldingName(name);

      if (topHoldingsMap[topHoldingKey]) {
        topHoldingsMap[topHoldingKey].value += valueInBaseCurrency;
      } else {
        topHoldingsMap[topHoldingKey] = {
          name,
          value: valueInBaseCurrency
        };
      }
    }

    expect(Object.values(topHoldingsMap)).toHaveLength(1);
    expect(Object.values(topHoldingsMap)[0].value).toEqual(90);
  });
});
