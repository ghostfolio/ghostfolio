import { findLatestFxQuote } from './benchmark-fx.adapter';

interface Quote {
  day: number;
  rate: string;
}

function linearSearch(quotes: Quote[], targetDay: number): Quote | undefined {
  return [...quotes].reverse().find(({ day }) => day <= targetDay);
}

describe('Benchmark FX binary search', () => {
  const quotes: Quote[] = [
    { day: 10, rate: '0.90' },
    { day: 12, rate: '0.92' },
    { day: 15, rate: '0.95' }
  ];

  it('returns the exact quotation', () => {
    expect(findLatestFxQuote(quotes, 12)).toEqual(quotes[1]);
  });

  it('returns the latest preceding quotation', () => {
    expect(findLatestFxQuote(quotes, 14)).toEqual(quotes[1]);
  });

  it('never returns a future quotation', () => {
    expect(findLatestFxQuote(quotes, 9)).toBeUndefined();
  });

  it('returns the last quotation after the final date', () => {
    expect(findLatestFxQuote(quotes, 20)).toEqual(quotes[2]);
  });

  it('handles an empty series', () => {
    expect(findLatestFxQuote([], 10)).toBeUndefined();
  });

  it('handles a single quotation', () => {
    expect(findLatestFxQuote([quotes[0]], 10)).toEqual(quotes[0]);
    expect(findLatestFxQuote([quotes[0]], 9)).toBeUndefined();
  });

  it('does not mutate the input', () => {
    const original = quotes.map(({ day, rate }) => ({ day, rate }));

    findLatestFxQuote(quotes, 14);

    expect(quotes).toEqual(original);
  });

  it('matches the linear search over 10000 quotations', () => {
    const longSeries: Quote[] = Array.from({ length: 10000 }, (_, index) => ({
      day: index * 2,
      rate: String(index + 1)
    }));

    for (let targetDay = -1; targetDay <= 20001; targetDay += 17) {
      expect(findLatestFxQuote(longSeries, targetDay)).toEqual(
        linearSearch(longSeries, targetDay)
      );
    }
  });

  it('matches the linear search for every boundary', () => {
    for (let targetDay = 0; targetDay <= 20; targetDay++) {
      expect(findLatestFxQuote(quotes, targetDay)).toEqual(
        linearSearch(quotes, targetDay)
      );
    }
  });
});
