import {
  getAvailableDateRanges,
  getStoredDateRange,
  saveStoredDateRange,
  STORED_DATE_RANGE_KEY
} from './date-range.helper';

describe('getAvailableDateRanges', () => {
  const referenceDate = new Date('2026-10-19T12:00:00.000Z');

  it('returns the short ranges without any activity', () => {
    expect(getAvailableDateRanges({ referenceDate })).toEqual([
      '1d',
      'wtd',
      'mtd',
      'ytd',
      'max'
    ]);
  });

  it('returns the short ranges for less than one year of data', () => {
    expect(
      getAvailableDateRanges({
        referenceDate,
        dateOfFirstActivity: new Date('2026-01-05T00:00:00.000Z')
      })
    ).toEqual(['1d', 'wtd', 'mtd', 'ytd', 'max']);
  });

  it('adds 1y after one year of data', () => {
    expect(
      getAvailableDateRanges({
        referenceDate,
        dateOfFirstActivity: new Date('2025-10-18T00:00:00.000Z')
      })
    ).toEqual(['1d', 'wtd', 'mtd', 'ytd', '1y', 'max']);
  });

  it('adds 1y and 5y after five years of data', () => {
    expect(
      getAvailableDateRanges({
        referenceDate,
        dateOfFirstActivity: '2021-10-18T00:00:00.000Z'
      })
    ).toEqual(['1d', 'wtd', 'mtd', 'ytd', '1y', '5y', 'max']);
  });
});

describe('stored date range', () => {
  const createStorage = (initial?: string) => {
    const items = new Map<string, string>();

    if (initial !== undefined) {
      items.set(STORED_DATE_RANGE_KEY, initial);
    }

    return {
      getItem: (key: string) => items.get(key) ?? null,
      setItem: (key: string, value: string) => {
        items.set(key, value);
      }
    };
  };

  it('returns undefined without a stored value', () => {
    expect(getStoredDateRange(createStorage())).toBeUndefined();
  });

  it('returns a valid stored value', () => {
    expect(getStoredDateRange(createStorage('ytd'))).toBe('ytd');
    expect(getStoredDateRange(createStorage('2025'))).toBe('2025');
  });

  it('ignores an invalid stored value', () => {
    expect(getStoredDateRange(createStorage('forever'))).toBeUndefined();
  });

  it('round-trips a saved value', () => {
    const storage = createStorage();

    saveStoredDateRange('mtd', storage);

    expect(getStoredDateRange(storage)).toBe('mtd');
  });

  it('does not throw if the storage is not available', () => {
    expect(
      getStoredDateRange({
        getItem: () => {
          throw new Error('denied');
        }
      })
    ).toBeUndefined();
  });
});
