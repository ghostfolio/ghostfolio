import { TrackinsightDataEnhancerService } from './trackinsight.service';

jest.mock('@ghostfolio/api/services/fetch/fetch.service', () => {
  return {
    FetchService: jest.fn()
  };
});

const FAILURE_MESSAGE = {
  _failure_reason: 'http_error',
  error: 'HTTP 405: Method Not Allowed',
  http_status: 405,
  status: 'failed',
  url: 'https://www.trackinsight.com/data-api/holdings/QQQ.json'
};

const FUND = {
  cusip: '46090E103',
  isins: ['US46090E1038', 'US46090E3018'],
  ticker: 'QQQ'
};

const HOLDINGS = {
  countries: {
    Other: { count: 1, weight: 0.01 },
    USA: { count: 99, weight: 0.99 }
  },
  sectors: {
    Financials: { count: 10, weight: 0.2 },
    'Information Technology': { count: 90, weight: 0.8 }
  },
  topHoldings: [
    { label: 'NVIDIA Corp.', weight: 0.08 },
    { label: 'Other', weight: 0.92 }
  ],
  weight: 0.9999
};

const SEARCH_RESULT = {
  results: { count: 221, docs: [{ ticker: 'QQQ' }], words: ['qqq'] }
};

describe('TrackinsightDataEnhancerService', () => {
  let fetchService: { fetch: jest.Mock };
  let trackinsightDataEnhancerService: TrackinsightDataEnhancerService;

  const enhance = (response = {}, symbol = 'QQQ') => {
    return trackinsightDataEnhancerService.enhance({
      symbol,
      requestTimeout: 1000,
      response: { assetClass: 'EQUITY', assetSubClass: 'ETF', ...response }
    });
  };

  const mockResponses = ({
    fund = Response.json(FUND),
    holdings = Response.json(HOLDINGS),
    search = Response.json(SEARCH_RESULT)
  }: {
    fund?: Response | Error;
    holdings?: Response | Error;
    search?: Response | Error;
  }) => {
    fetchService.fetch.mockImplementation((url: string) => {
      let result = fund;

      if (url.includes('/search-api/')) {
        result = search;
      } else if (url.includes('/data-api/holdings/')) {
        result = holdings;
      }

      return result instanceof Error
        ? Promise.reject(result)
        : Promise.resolve(result.clone());
    });
  };

  beforeEach(() => {
    fetchService = { fetch: jest.fn() };

    trackinsightDataEnhancerService = new TrackinsightDataEnhancerService(
      null,
      fetchService as any
    );
  });

  it('should skip an asset which is not a fund', async () => {
    const response = await enhance({ assetSubClass: 'STOCK' });

    expect(fetchService.fetch).not.toHaveBeenCalled();
    expect(response.countries).toBeUndefined();
  });

  it('should enhance the asset profile with a valid response', async () => {
    mockResponses({});

    await expect(enhance()).resolves.toEqual({
      assetClass: 'EQUITY',
      assetSubClass: 'ETF',
      countries: [{ code: 'US', weight: 0.99 }],
      cusip: '46090E103',
      holdings: [{ name: 'NVIDIA Corp.', weight: 0.08 }],
      isin: 'US46090E1038',
      sectors: [
        { name: 'Financial Services', weight: 0.2 },
        { name: 'Technology', weight: 0.8 }
      ]
    });
  });

  it('should keep the lists of the data provider', async () => {
    mockResponses({});

    const countries = [{ code: 'DE', weight: 1 }];
    const holdings = [{ name: 'SAP SE', weight: 1 }];
    const sectors = [{ name: 'Technology', weight: 1 }];

    const response = await enhance({ countries, holdings, sectors });

    expect(response.countries).toEqual(countries);
    expect(response.holdings).toEqual(holdings);
    expect(response.sectors).toEqual(sectors);
  });

  it('should encode the symbol in the URL of the search', async () => {
    mockResponses({
      search: Response.json({ results: { count: 0, docs: [] } })
    });

    await enhance({}, 'BRK/B');

    expect(fetchService.fetch.mock.calls[0][0]).toContain(
      '/search_v2/BRK%2FB/'
    );
  });

  it.each([
    ['a failed request', new Error('The operation timed out')],
    ['an error status', new Response(null, { status: 405 })],
    ['a body which is not JSON', new Response('<html></html>')],
    ['a failure message', Response.json(FAILURE_MESSAGE)],
    ['a false tool call', Response.json({ url: 'https://www.example.com' })]
  ])(
    'should not change the asset profile on %s in the search',
    async (_, search) => {
      mockResponses({ search });

      await expect(enhance()).resolves.toEqual({
        assetClass: 'EQUITY',
        assetSubClass: 'ETF'
      });
    }
  );

  it('should not use a search result without a ticker', async () => {
    mockResponses({
      search: Response.json({ results: { count: 1, docs: [{}] } })
    });

    await enhance();

    expect(fetchService.fetch).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['a failed request', new Error('The operation timed out')],
    ['an error status', new Response(null, { status: 502 })],
    ['a body which is not JSON', new Response('`AccessDenied`Access Denied')],
    ['a failure message', Response.json(FAILURE_MESSAGE)],
    ['a missing weight', Response.json({ ...HOLDINGS, weight: undefined })],
    [
      'a weight which is not a number',
      Response.json({ ...HOLDINGS, weight: '1' })
    ],
    [
      'a weight below the threshold',
      Response.json({ ...HOLDINGS, weight: 0.5 })
    ],
    ['a weight above the maximum', Response.json({ ...HOLDINGS, weight: 1.5 })],
    [
      'an invalid weight of a country',
      Response.json({ ...HOLDINGS, countries: { USA: { weight: 99 } } })
    ],
    [
      'an invalid weight of a sector',
      Response.json({ ...HOLDINGS, sectors: { Materials: { weight: -0.1 } } })
    ],
    [
      'an invalid item of the top holdings',
      Response.json({ ...HOLDINGS, topHoldings: [{ weight: 0.1 }] })
    ],
    [
      'top holdings which are not a list',
      Response.json({ ...HOLDINGS, topHoldings: 'NVIDIA Corp.' })
    ]
  ])('should not add lists on %s in the holdings', async (_, holdings) => {
    mockResponses({ holdings });

    const response = await enhance();

    expect(response).not.toHaveProperty('countries');
    expect(response).not.toHaveProperty('holdings');
    expect(response).not.toHaveProperty('sectors');
  });

  it('should keep the cusip and the isin if the holdings fail', async () => {
    mockResponses({ holdings: Response.json(FAILURE_MESSAGE) });

    const response = await enhance();

    expect(response.cusip).toBe('46090E103');
    expect(response.isin).toBe('US46090E1038');
  });

  it('should not add empty lists', async () => {
    mockResponses({
      holdings: Response.json({
        countries: {},
        sectors: {},
        topHoldings: [],
        weight: 1
      })
    });

    const response = await enhance();

    expect(response).not.toHaveProperty('countries');
    expect(response).not.toHaveProperty('holdings');
    expect(response).not.toHaveProperty('sectors');
  });

  it('should accept floating point noise in a weight', async () => {
    mockResponses({
      holdings: Response.json({
        ...HOLDINGS,
        countries: { USA: { weight: 1.0000000000000002 } },
        weight: 1.0000000000000002
      })
    });

    const response = await enhance();

    expect(response.countries).toEqual([
      { code: 'US', weight: 1.0000000000000002 }
    ]);
  });

  it.each([
    ['a failure message', Response.json(FAILURE_MESSAGE)],
    ['an invalid cusip and isins', Response.json({ cusip: 1, isins: 'US' })],
    ['a non-string isin', Response.json({ isins: [1] })]
  ])('should not set the cusip or the isin on %s', async (_, fund) => {
    mockResponses({ fund });

    const response = await enhance();

    expect(response).not.toHaveProperty('cusip');
    expect(response).not.toHaveProperty('isin');
  });
});
