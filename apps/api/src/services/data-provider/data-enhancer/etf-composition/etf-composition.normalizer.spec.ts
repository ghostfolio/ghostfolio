import { normalizeEtfComposition } from './etf-composition.normalizer';

describe('ETF composition normalizer', () => {
  describe('classified sector coverage regression', () => {
    it('excludes an entirely Other distribution', () => {
      const result = normalizeEtfComposition({
        sectors: [{ name: 'Other', weight: 1 }]
      });

      expect(result.sectorCoverage).toBe(1);
      expect(result.classifiedSectorCoverage).toBe(0);
    });

    it('preserves 99 percent classified coverage', () => {
      const result = normalizeEtfComposition({
        sectors: [
          { name: 'Information Technology', weight: 0.99 },
          { name: 'Other', weight: 0.01 }
        ]
      });

      expect(result.sectorCoverage).toBe(1);
      expect(result.classifiedSectorCoverage).toBe(0.99);
    });

    it('preserves 1 percent classified coverage', () => {
      const result = normalizeEtfComposition({
        sectors: [
          { name: 'Information Technology', weight: 0.01 },
          { name: 'Other', weight: 0.99 }
        ]
      });

      expect(result.sectorCoverage).toBe(1);
      expect(result.classifiedSectorCoverage).toBe(0.01);
    });

    it('excludes unknown sectors mapped to Other', () => {
      const result = normalizeEtfComposition({
        sectors: [
          { name: 'Unrecognized Sector', weight: 0.4 },
          { name: 'Financials', weight: 0.6 }
        ]
      });

      expect(result.sectorCoverage).toBe(1);
      expect(result.classifiedSectorCoverage).toBe(0.6);
      expect(result.sectors).toContainEqual({
        name: 'Other',
        weight: 0.4
      });
    });
  });

  it('accepts ISO country codes directly', () => {
    const result = normalizeEtfComposition({
      countries: [
        { name: 'US', weight: 0.6 },
        { name: 'JP', weight: 0.4 }
      ]
    });

    expect(result.countries).toEqual([
      { code: 'US', weight: 0.6 },
      { code: 'JP', weight: 0.4 }
    ]);
  });

  it('normalizes countries and aggregates duplicates', () => {
    const result = normalizeEtfComposition({
      countries: [
        { name: 'United States', weight: 0.5 },
        { name: 'United States', weight: 0.2 },
        { name: 'Japan', weight: 0.1 }
      ]
    });

    expect(result.countries).toEqual([
      { code: 'US', weight: 0.7 },
      { code: 'JP', weight: 0.1 }
    ]);

    expect(result.countryCoverage).toBe(0.8);
    expect(result.missingCountryWeight).toBe(0.2);
  });

  it('preserves unclassified and missing country exposure', () => {
    const result = normalizeEtfComposition({
      countries: [
        { name: 'United States', weight: 0.6 },
        { name: 'Japan', weight: 0.3 },
        { name: 'Other', weight: 0.07 }
      ]
    });

    expect(result.countryCoverage).toBe(0.9);
    expect(result.unclassifiedCountryWeight).toBe(0.07);
    expect(result.missingCountryWeight).toBe(0.03);
  });

  it('maps provider sectors to Ghostfolio ontology', () => {
    const result = normalizeEtfComposition({
      sectors: [
        { name: 'Information Technology', weight: 0.2 },
        { name: 'Technology', weight: 0.1 },
        { name: 'Financials', weight: 0.15 },
        { name: 'Health Care', weight: 0.1 },
        { name: 'Consumer Discretionary', weight: 0.1 },
        { name: 'Consumer Staples', weight: 0.1 },
        { name: 'Communication', weight: 0.05 },
        { name: 'Materials', weight: 0.05 },
        { name: 'Unrecognized Sector', weight: 0.05 }
      ]
    });

    expect(result.sectors).toEqual([
      { name: 'Technology', weight: 0.3 },
      { name: 'Financial Services', weight: 0.15 },
      { name: 'Healthcare', weight: 0.1 },
      { name: 'Consumer Cyclical', weight: 0.1 },
      { name: 'Consumer Defensive', weight: 0.1 },
      { name: 'Communication Services', weight: 0.05 },
      { name: 'Basic Materials', weight: 0.05 },
      { name: 'Other', weight: 0.05 }
    ]);
  });

  it('rejects negative and non-finite weights', () => {
    for (const weight of [-0.01, NaN, Infinity]) {
      expect(() =>
        normalizeEtfComposition({
          countries: [{ name: 'Japan', weight }]
        })
      ).toThrow('Invalid ETF exposure weight');
    }
  });

  it('rejects country allocations above 100%', () => {
    expect(() =>
      normalizeEtfComposition({
        countries: [
          { name: 'Japan', weight: 0.7 },
          { name: 'United States', weight: 0.4 }
        ]
      })
    ).toThrow('ETF country weights exceed 100%');
  });

  it('rejects sector allocations above 100%', () => {
    expect(() =>
      normalizeEtfComposition({
        sectors: [
          { name: 'Technology', weight: 0.7 },
          { name: 'Financials', weight: 0.4 }
        ]
      })
    ).toThrow('ETF sector weights exceed 100%');
  });

  it('rejects invalid exposure names', () => {
    expect(() =>
      normalizeEtfComposition({
        countries: [{ name: ' ', weight: 0.5 }]
      })
    ).toThrow('Invalid ETF exposure name');
  });

  it('accepts floating point rounding near 100%', () => {
    const result = normalizeEtfComposition({
      countries: [
        { name: 'United States', weight: 0.6 },
        { name: 'Japan', weight: 0.40000001 }
      ]
    });

    expect(result.missingCountryWeight).toBe(0);
  });

  it('keeps incomplete allocations without renormalizing', () => {
    const result = normalizeEtfComposition({
      countries: [
        { name: 'United States', weight: 0.6 },
        { name: 'Japan', weight: 0.1 }
      ]
    });

    expect(result.countryCoverage).toBe(0.7);
    expect(result.missingCountryWeight).toBe(0.3);
  });

  it('distinguishes absent and empty input', () => {
    const absent = normalizeEtfComposition({});
    const empty = normalizeEtfComposition({
      countries: [],
      sectors: []
    });

    expect(absent.countries).toEqual([]);
    expect(empty.countries).toEqual([]);
    expect(absent.missingCountryWeight).toBe(1);
    expect(empty.missingCountryWeight).toBe(1);
  });
});
