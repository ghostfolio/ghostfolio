import { redactAttributes } from './object.helper';

describe('redactAttributes', () => {
  it('should redact provided attributes', () => {
    expect(redactAttributes({ object: {}, options: [] })).toStrictEqual({});

    expect(
      redactAttributes({ object: { value: 1000 }, options: [] })
    ).toStrictEqual({ value: 1000 });

    expect(
      redactAttributes({
        object: { value: 1000 },
        options: [{ attribute: 'value', valueMap: { '*': null } }]
      })
    ).toStrictEqual({ value: null });

    expect(
      redactAttributes({
        object: { value: 'abc' },
        options: [{ attribute: 'value', valueMap: { abc: 'xyz' } }]
      })
    ).toStrictEqual({ value: 'xyz' });

    expect(
      redactAttributes({
        object: { data: [{ value: 'a' }, { value: 'b' }] },
        options: [{ attribute: 'value', valueMap: { a: 1, b: 2 } }]
      })
    ).toStrictEqual({ data: [{ value: 1 }, { value: 2 }] });

    expect(
      redactAttributes({
        object: { value1: 'a', value2: 'b' },
        options: [
          { attribute: 'value1', valueMap: { a: 'x' } },
          { attribute: 'value2', valueMap: { '*': 'y' } }
        ]
      })
    ).toStrictEqual({ value1: 'x', value2: 'y' });

    console.time('redactAttributes execution time');
    expect(
      redactAttributes({
        object: {
          accounts: {
            '2e937c05-657c-4de9-8fb3-0813a2245f26': {
              balance: 0,
              currency: 'EUR',
              name: 'Bondora Account',
              valueInBaseCurrency: 2231.644722160232,
              valueInPercentage: 0.014036487867880205
            },
            'd804de69-0429-42dc-b6ca-b308fd7dd926': {
              balance: 390,
              currency: 'USD',
              name: 'Coinbase Account',
              valueInBaseCurrency: 37375.033270399996,
              valueInPercentage: 0.23507962349569783
            },
            '65cfb79d-b6c7-4591-9d46-73426bc62094': {
              balance: 0,
              currency: 'EUR',
              name: 'DEGIRO Account',
              valueInBaseCurrency: 90452.98295843479,
              valueInPercentage: 0.5689266688833119
            },
            '480269ce-e12a-4fd1-ac88-c4b0ff3f899c': {
              balance: 0,
              currency: 'USD',
              name: 'Interactive Brokers Account',
              valueInBaseCurrency: 43941,
              valueInPercentage: 0.27637791413567103
            },
            '123eafcb-362e-4320-92c5-324621014ee5': {
              balance: 0,
              currency: 'CHF',
              name: 'Pillar 3a 🇨🇭',
              valueInBaseCurrency: 22363.19795483481,
              valueInPercentage: 0.14065892911313693
            },
            '8c623328-6035-4b5f-b6d5-702cc1c9c56b': {
              balance: 47500,
              currency: 'USD',
              name: 'Private Banking Account',
              valueInBaseCurrency: 47500,
              valueInPercentage: 0.2987631351458632
            },
            '206b2330-25a5-4d0a-b84b-c7194828f3c7': {
              balance: 2000,
              currency: 'USD',
              name: 'Revolut Account',
              valueInBaseCurrency: 2000,
              valueInPercentage: 0.01257950042719424
            }
          },
          hasError: false,
          holdings: {
            'AAPL.US': {
              currency: 'USD',
              markets: {
                UNKNOWN: 0,
                developedMarkets: 1,
                emergingMarkets: 0,
                otherMarkets: 0
              },
              marketsAdvanced: {
                UNKNOWN: 0,
                asiaPacific: 0,
                emergingMarkets: 0,
                europe: 0,
                japan: 0,
                northAmerica: 1,
                otherMarkets: 0
              },
              marketPrice: 220.79,
              symbol: 'AAPL.US',
              tags: [],
              transactionCount: 1,
              allocationInPercentage: 0.044900865255793135,
              assetClass: 'EQUITY',
              assetSubClass: 'STOCK',
              countries: [
                {
                  code: 'US',
                  weight: 1,
                  continent: 'North America',
                  name: 'United States'
                }
              ],
              dataSource: 'EOD_HISTORICAL_DATA',
              dateOfFirstActivity: '2021-11-30T23:00:00.000Z',
              dividend: 0,
              grossPerformance: 2665.5,
              grossPerformancePercent: 0.3183066634822068,
              grossPerformancePercentWithCurrencyEffect: 0.3183066634822068,
              grossPerformanceWithCurrencyEffect: 2665.5,
              holdings: [],
              investment: 0.060265768702233234,
              name: 'Apple Inc',
              netPerformance: 2664.5,
              netPerformancePercent: 0.3181872462383568,
              netPerformancePercentWithCurrencyEffect: 0.3181872462383568,
              netPerformanceWithCurrencyEffect: 2664.5,
              quantity: 50,
              sectors: [{ name: 'Technology', weight: 1 }],
              url: 'https://www.apple.com',
              valueInBaseCurrency: 11039.5,
              valueInPercentage: 0.0694356974830054
            },
            'ALV.DE': {
              currency: 'EUR',
              markets: {
                UNKNOWN: 0,
                developedMarkets: 1,
                emergingMarkets: 0,
                otherMarkets: 0
              },
              marketsAdvanced: {
                UNKNOWN: 0,
                asiaPacific: 0,
                emergingMarkets: 0,
                europe: 1,
                japan: 0,
                northAmerica: 0,
                otherMarkets: 0
              },
              marketPrice: 296.5,
              symbol: 'ALV.DE',
              tags: [],
              transactionCount: 2,
              allocationInPercentage: 0.026912563036519527,
              assetClass: 'EQUITY',
              assetSubClass: 'STOCK',
              countries: [
                { code: 'DE', weight: 1, continent: 'Europe', name: 'Germany' }
              ],
              dataSource: 'YAHOO',
              dateOfFirstActivity: '2021-04-22T22:00:00.000Z',
              dividend: 192,
              grossPerformance: 1793.7960276723945,
              grossPerformancePercent: 0.3719230057375532,
              grossPerformancePercentWithCurrencyEffect: 0.2650716044872953,
              grossPerformanceWithCurrencyEffect: 1386.429698978564,
              holdings: [],
              investment: 0.03471025137190358,
              name: 'Allianz SE',
              netPerformance: 1789.1095737558583,
              netPerformancePercent: 0.3709513233388858,
              netPerformancePercentWithCurrencyEffect: 0.26409992208862787,
              netPerformanceWithCurrencyEffect: 1381.3474143706258,
              quantity: 20,
              sectors: [{ name: 'Financial Services', weight: 1 }],
              url: 'https://www.allianz.com',
              valueInBaseCurrency: 6616.826601205088,
              valueInPercentage: 0.04161818652826481
            },
            AMZN: {
              currency: 'USD',
              markets: {
                UNKNOWN: 0,
                developedMarkets: 1,
                emergingMarkets: 0,
                otherMarkets: 0
              },
              marketsAdvanced: {
                UNKNOWN: 0,
                asiaPacific: 0,
                emergingMarkets: 0,
                europe: 0,
                japan: 0,
                northAmerica: 1,
                otherMarkets: 0
              },
              marketPrice: 187.99,
              symbol: 'AMZN',
              tags: [],
              transactionCount: 1,
              allocationInPercentage: 0.07646101417126275,
              assetClass: 'EQUITY',
              assetSubClass: 'STOCK',
              countries: [
                {
                  code: 'US',
                  weight: 1,
                  continent: 'North America',
                  name: 'United States'
                }
              ],
              dataSource: 'YAHOO',
              dateOfFirstActivity: '2018-09-30T22:00:00.000Z',
              dividend: 0,
              grossPerformance: 8689.05,
              grossPerformancePercent: 0.8594552890963852,
              grossPerformancePercentWithCurrencyEffect: 0.8594552890963852,
              grossPerformanceWithCurrencyEffect: 8689.05,
              holdings: [],
              investment: 0.07275900505029173,
              name: 'Amazon.com, Inc.',
              netPerformance: 8608.26,
              netPerformancePercent: 0.8514641516525799,
              netPerformancePercentWithCurrencyEffect: 0.8514641516525799,
              netPerformanceWithCurrencyEffect: 8608.26,
              quantity: 100,
              sectors: [{ name: 'Consumer Cyclical', weight: 1 }],
              url: 'https://www.aboutamazon.com',
              valueInBaseCurrency: 18799,
              valueInPercentage: 0.11824101426541227
            },
            bitcoin: {
              currency: 'USD',
              markets: {
                UNKNOWN: 36985.0332704,
                developedMarkets: 0,
                emergingMarkets: 0,
                otherMarkets: 0
              },
              marketsAdvanced: {
                UNKNOWN: 36985.0332704,
                asiaPacific: 0,
                emergingMarkets: 0,
                europe: 0,
                japan: 0,
                northAmerica: 0,
                otherMarkets: 0
              },
              marketPrice: 65872,
              symbol: 'bitcoin',
              tags: [
                {
                  id: '795ebca3-6777-4325-b7ff-f55d94f460fe',
                  name: 'HIGHER_RISK',
                  userId: null
                }
              ],
              transactionCount: 1,
              allocationInPercentage: 0.15042891393226654,
              assetClass: 'LIQUIDITY',
              assetSubClass: 'CRYPTOCURRENCY',
              countries: [],
              dataSource: 'COINGECKO',
              dateOfFirstActivity: '2017-08-15T22:00:00.000Z',
              dividend: 0,
              grossPerformance: 34985.0332704,
              grossPerformancePercent: 17.4925166352,
              grossPerformancePercentWithCurrencyEffect: 17.4925166352,
              grossPerformanceWithCurrencyEffect: 34985.0332704,
              holdings: [],
              investment: 0.014393543993846005,
              name: 'Bitcoin',
              netPerformance: 34955.1332704,
              netPerformancePercent: 17.477566635200002,
              netPerformancePercentWithCurrencyEffect: 17.477566635200002,
              netPerformanceWithCurrencyEffect: 34955.1332704,
              quantity: 0.5614682,
              sectors: [],
              url: null,
              valueInBaseCurrency: 36985.0332704,
              valueInPercentage: 0.232626620912395
            },
            BONDORA_GO_AND_GROW: {
              currency: 'EUR',
              markets: {
                UNKNOWN: 2231.644722160232,
                developedMarkets: 0,
                emergingMarkets: 0,
                otherMarkets: 0
              },
              marketsAdvanced: {
                UNKNOWN: 2231.644722160232,
                asiaPacific: 0,
                emergingMarkets: 0,
                europe: 0,
                japan: 0,
                northAmerica: 0,
                otherMarkets: 0
              },
              marketPrice: 1,
              symbol: 'BONDORA_GO_AND_GROW',
              tags: [
                {
                  id: '795ebca3-6777-4325-b7ff-f55d94f460fe',
                  name: 'HIGHER_RISK',
                  userId: null
                }
              ],
              transactionCount: 5,
              allocationInPercentage: 0.009076749759365777,
              assetClass: 'FIXED_INCOME',
              assetSubClass: 'BOND',
              countries: [],
              dataSource: 'MANUAL',
              dateOfFirstActivity: '2021-01-31T23:00:00.000Z',
              dividend: 11.45,
              grossPerformance: 0,
              grossPerformancePercent: 0,
              grossPerformancePercentWithCurrencyEffect: -0.06153834320225245,
              grossPerformanceWithCurrencyEffect: -125.68932723700505,
              holdings: [],
              investment: 0.016060638243523776,
              name: 'Bondora Go & Grow',
              netPerformance: 0,
              netPerformancePercent: 0,
              netPerformancePercentWithCurrencyEffect: -0.06118537471467475,
              netPerformanceWithCurrencyEffect: -125.68932723700505,
              quantity: 2000,
              sectors: [],
              url: null,
              valueInBaseCurrency: 2231.644722160232,
              valueInPercentage: 0.014036487867880205
            },
            FRANKLY95P: {
              currency: 'CHF',
              markets: {
                UNKNOWN: 0,
                developedMarkets: 0.79567,
                emergingMarkets: 0.07075,
                otherMarkets: 0
              },
              marketsAdvanced: {
                UNKNOWN: 0,
                asiaPacific: 0.01333,
                emergingMarkets: 0.07075,
                europe: 0.35204,
                japan: 0.03925,
                northAmerica: 0.39105,
                otherMarkets: 0
              },
              marketPrice: 177.62,
              symbol: 'FRANKLY95P',
              tags: [
                {
                  id: '6caface3-cb98-4605-a357-03792b6746c6',
                  name: 'RETIREMENT_PROVISION',
                  userId: null
                }
              ],
              transactionCount: 6,
              allocationInPercentage: 0.09095764645669335,
              assetClass: 'EQUITY',
              assetSubClass: 'ETF',
              countries: [
                {
                  code: 'US',
                  weight: 0.37292,
                  continent: 'North America',
                  name: 'United States'
                },
                {
                  code: 'CH',
                  weight: 0.30022,
                  continent: 'Europe',
                  name: 'Switzerland'
                },
                {
                  code: 'JP',
                  weight: 0.03925,
                  continent: 'Asia',
                  name: 'Japan'
                },
                {
                  code: 'CN',
                  weight: 0.03353,
                  continent: 'Asia',
                  name: 'China'
                },
                {
                  code: 'GB',
                  weight: 0.02285,
                  continent: 'Europe',
                  name: 'United Kingdom'
                },
                {
                  code: 'CA',
                  weight: 0.01813,
                  continent: 'North America',
                  name: 'Canada'
                },
                {
                  code: 'FR',
                  weight: 0.01465,
                  continent: 'Europe',
                  name: 'France'
                },
                {
                  code: 'DE',
                  weight: 0.01432,
                  continent: 'Europe',
                  name: 'Germany'
                },
                {
                  code: 'TW',
                  weight: 0.01427,
                  continent: 'Asia',
                  name: 'Taiwan'
                },
                {
                  code: 'AU',
                  weight: 0.01333,
                  continent: 'Oceania',
                  name: 'Australia'
                },
                {
                  code: 'KR',
                  weight: 0.01172,
                  continent: 'Asia',
                  name: 'South Korea'
                },
                {
                  code: 'IN',
                  weight: 0.01123,
                  continent: 'Asia',
                  name: 'India'
                }
              ],
              dataSource: 'MANUAL',
              dateOfFirstActivity: '2021-03-31T22:00:00.000Z',
              dividend: 0,
              grossPerformance: 3533.389614611676,
              grossPerformancePercent: 0.27579517683678895,
              grossPerformancePercentWithCurrencyEffect: 0.458553421589667,
              grossPerformanceWithCurrencyEffect: 5322.44900391902,
              holdings: [],
              investment: 0.13551383737034509,
              name: 'frankly Extreme 95 Index',
              netPerformance: 3533.389614611676,
              netPerformancePercent: 0.27579517683678895,
              netPerformancePercentWithCurrencyEffect: 0.43609380217769156,
              netPerformanceWithCurrencyEffect: 5322.44900391902,
              quantity: 105.87328656807,
              sectors: [],
              url: 'https://www.frankly.ch',
              valueInBaseCurrency: 22363.19795483481,
              valueInPercentage: 0.14065892911313693
            },
            MSFT: {
              currency: 'USD',
              markets: {
                UNKNOWN: 0,
                developedMarkets: 1,
                emergingMarkets: 0,
                otherMarkets: 0
              },
              marketsAdvanced: {
                UNKNOWN: 0,
                asiaPacific: 0,
                emergingMarkets: 0,
                europe: 0,
                japan: 0,
                northAmerica: 1,
                otherMarkets: 0
              },
              marketPrice: 428.02,
              symbol: 'MSFT',
              tags: [],
              transactionCount: 1,
              allocationInPercentage: 0.05222646409742627,
              assetClass: 'EQUITY',
              assetSubClass: 'STOCK',
              countries: [
                {
                  code: 'US',
                  weight: 1,
                  continent: 'North America',
                  name: 'United States'
                }
              ],
              dataSource: 'YAHOO',
              dateOfFirstActivity: '2023-01-02T23:00:00.000Z',
              dividend: 0,
              grossPerformance: 5653.2,
              grossPerformancePercent: 0.7865431171216295,
              grossPerformancePercentWithCurrencyEffect: 0.7865431171216295,
              grossPerformanceWithCurrencyEffect: 5653.2,
              holdings: [],
              investment: 0.051726079050684395,
              name: 'Microsoft Corporation',
              netPerformance: 5653.2,
              netPerformancePercent: 0.7865431171216295,
              netPerformancePercentWithCurrencyEffect: 0.7865431171216295,
              netPerformanceWithCurrencyEffect: 5653.2,
              quantity: 30,
              sectors: [{ name: 'Technology', weight: 1 }],
              url: 'https://www.microsoft.com',
              valueInBaseCurrency: 12840.6,
              valueInPercentage: 0.08076416659271518
            },
            TSLA: {
              currency: 'USD',
              markets: {
                UNKNOWN: 0,
                developedMarkets: 1,
                emergingMarkets: 0,
                otherMarkets: 0
              },
              marketsAdvanced: {
                UNKNOWN: 0,
                asiaPacific: 0,
                emergingMarkets: 0,
                europe: 0,
                japan: 0,
                northAmerica: 1,
                otherMarkets: 0
              },
              marketPrice: 260.46,
              symbol: 'TSLA',
              tags: [],
              transactionCount: 1,
              allocationInPercentage: 0.1589050142378352,
              assetClass: 'EQUITY',
              assetSubClass: 'STOCK',
              countries: [
                {
                  code: 'US',
                  weight: 1,
                  continent: 'North America',
                  name: 'United States'
                }
              ],
              dataSource: 'YAHOO',
              dateOfFirstActivity: '2017-01-02T23:00:00.000Z',
              dividend: 0,
              grossPerformance: 36920.500000005,
              grossPerformancePercent: 17.184314638161936,
              grossPerformancePercentWithCurrencyEffect: 17.184314638161936,
              grossPerformanceWithCurrencyEffect: 36920.500000005,
              holdings: [],
              investment: 0.01546226463535309,
              name: 'Tesla, Inc.',
              netPerformance: 36890.500000005,
              netPerformancePercent: 17.170351408001327,
              netPerformancePercentWithCurrencyEffect: 17.170351408001327,
              netPerformanceWithCurrencyEffect: 36890.500000005,
              quantity: 150,
              sectors: [{ name: 'Consumer Cyclical', weight: 1 }],
              url: 'https://www.tesla.com',
              valueInBaseCurrency: 39069,
              valueInPercentage: 0.2457342510950259
            },
            VTI: {
              currency: 'USD',
              markets: {
                UNKNOWN: 0,
                developedMarkets: 0.9794119422809896,
                emergingMarkets: 0,
                otherMarkets: 0.00016100142888768383
              },
              marketsAdvanced: {
                UNKNOWN: 0,
                asiaPacific: 0,
                emergingMarkets: 0,
                europe: 0.00019118919680412454,
                japan: 0,
                northAmerica: 0.9792207530841855,
                otherMarkets: 0.00016100142888768383
              },
              marketPrice: 282.05,
              symbol: 'VTI',
              tags: [],
              transactionCount: 5,
              allocationInPercentage: 0.057358979326040366,
              assetClass: 'EQUITY',
              assetSubClass: 'ETF',
              countries: [
                {
                  code: 'US',
                  weight: 0.9788987502264102,
                  continent: 'North America',
                  name: 'United States'
                },
                {
                  code: 'CA',
                  weight: 0.0003220028577753677,
                  continent: 'North America',
                  name: 'Canada'
                },
                {
                  code: 'NL',
                  weight: 0.0001811266074986443,
                  continent: 'Europe',
                  name: 'Netherlands'
                },
                {
                  code: 'BM',
                  weight: 0.00009056330374932214,
                  continent: 'North America',
                  name: 'Bermuda'
                },
                {
                  code: 'KY',
                  weight: 0.00007043812513836169,
                  continent: 'North America',
                  name: 'Cayman Islands'
                },
                {
                  code: 'IL',
                  weight: 0.00001006258930548024,
                  continent: 'Asia',
                  name: 'Israel'
                }
              ],
              dataSource: 'YAHOO',
              dateOfFirstActivity: '2019-02-28T23:00:00.000Z',
              dividend: 0,
              grossPerformance: 5856.3,
              grossPerformancePercent: 0.8832083851170418,
              grossPerformancePercentWithCurrencyEffect: 0.8832083851170418,
              grossPerformanceWithCurrencyEffect: 5856.3,
              holdings: [
                {
                  allocationInPercentage: 0.06099941636982121,
                  name: 'APPLE INC',
                  valueInBaseCurrency: 860.2442693554036
                },
                {
                  allocationInPercentage: 0.05862464529372787,
                  name: 'MICROSOFT CORP',
                  valueInBaseCurrency: 826.7540602547973
                },
                {
                  allocationInPercentage: 0.05156070760128074,
                  name: 'NVIDIA CORP',
                  valueInBaseCurrency: 727.1348789470617
                },
                {
                  allocationInPercentage: 0.03301535551128066,
                  name: 'AMAZON COM INC',
                  valueInBaseCurrency: 465.5990510978355
                },
                {
                  allocationInPercentage: 0.01962204914568647,
                  name: 'FACEBOOK CLASS A  INC',
                  valueInBaseCurrency: 276.71994807704345
                },
                {
                  allocationInPercentage: 0.01902835637666313,
                  name: 'ALPHABET INC CLASS A',
                  valueInBaseCurrency: 268.34739580189176
                },
                {
                  allocationInPercentage: 0.01555676306627245,
                  name: 'ALPHABET INC CLASS C',
                  valueInBaseCurrency: 219.3892511421072
                },
                {
                  allocationInPercentage: 0.01463100485016827,
                  name: 'BERKSHIRE HATHAWAY INC CLASS B',
                  valueInBaseCurrency: 206.33374589949804
                },
                {
                  allocationInPercentage: 0.01403731208114493,
                  name: 'BROADCOM INC',
                  valueInBaseCurrency: 197.96119362434638
                },
                {
                  allocationInPercentage: 0.01297067761476403,
                  name: 'ELI LILLY',
                  valueInBaseCurrency: 182.91898106220972
                },
                {
                  allocationInPercentage: 0.0118637927911612,
                  name: 'TESLA INC',
                  valueInBaseCurrency: 167.30913783735082
                },
                {
                  allocationInPercentage: 0.01152166475477487,
                  name: 'JPMORGAN CHASE & CO',
                  valueInBaseCurrency: 162.48427720421262
                },
                {
                  allocationInPercentage: 0.0100324015375638,
                  name: 'EXXON MOBIL CORP',
                  valueInBaseCurrency: 141.4819426834935
                },
                {
                  allocationInPercentage: 0.01000221376964736,
                  name: 'UNITEDHEALTH GROUP INC',
                  valueInBaseCurrency: 141.0562196864519
                },
                {
                  allocationInPercentage: 0.007818631890358146,
                  name: 'VISA INC CLASS A',
                  valueInBaseCurrency: 110.26225623377576
                }
              ],
              investment: 0.05934602124102648,
              name: 'Vanguard Total Stock Market Index Fund ETF Shares',
              netPerformance: 5756.8,
              netPerformancePercent: 0.8682024540139314,
              netPerformancePercentWithCurrencyEffect: 0.8328704068843998,
              netPerformanceWithCurrencyEffect: 5756.8,
              quantity: 50,
              sectors: [
                { name: 'Technology', weight: 0.3739157560023398 },
                { name: 'Consumer Cyclical', weight: 0.1168065366580148 },
                { name: 'Industrials', weight: 0.09138843607237156 },
                { name: 'Healthcare', weight: 0.1172291654088449 },
                { name: 'Energy', weight: 0.03762402141319062 },
                { name: 'Consumer Staples', weight: 0.05152045724405886 },
                { name: 'Financials', weight: 0.1127613757572116 },
                { name: 'Telecommunications', weight: 0.007557004568415658 },
                { name: 'Real Estate', weight: 0.02587091710438972 },
                { name: 'Communication', weight: 0.002062830807623449 },
                { name: 'Utilities', weight: 0.02208738352552914 },
                { name: 'Materials', weight: 0.020366680754292 },
                { name: 'Other', weight: 0.0003823783936082492 }
              ],
              url: 'https://www.vanguard.com',
              valueInBaseCurrency: 14102.5,
              valueInPercentage: 0.08870120238725339
            },
            'VWRL.SW': {
              currency: 'CHF',
              markets: {
                UNKNOWN: 0,
                developedMarkets: 0.881487000000001,
                emergingMarkets: 0.11228900000000001,
                otherMarkets: 0.0038099999999999996
              },
              marketsAdvanced: {
                UNKNOWN: 0,
                asiaPacific: 0.03252,
                emergingMarkets: 0.11228900000000001,
                europe: 0.170033,
                japan: 0.06258100000000001,
                northAmerica: 0.6163530000000008,
                otherMarkets: 0.0038099999999999996
              },
              marketPrice: 117.62,
              symbol: 'VWRL.SW',
              tags: [],
              transactionCount: 5,
              allocationInPercentage: 0.09386983901959013,
              assetClass: 'EQUITY',
              assetSubClass: 'ETF',
              countries: [
                {
                  code: 'US',
                  weight: 0.5903140000000008,
                  continent: 'North America',
                  name: 'United States'
                },
                {
                  code: 'TW',
                  weight: 0.017327000000000002,
                  continent: 'Asia',
                  name: 'Taiwan'
                },
                {
                  code: 'CN',
                  weight: 0.040376999999999996,
                  continent: 'Asia',
                  name: 'China'
                },
                {
                  code: 'CH',
                  weight: 0.024700999999999997,
                  continent: 'Europe',
                  name: 'Switzerland'
                },
                {
                  code: 'KR',
                  weight: 0.014147,
                  continent: 'Asia',
                  name: 'South Korea'
                },
                {
                  code: 'NL',
                  weight: 0.013718000000000001,
                  continent: 'Europe',
                  name: 'Netherlands'
                },
                {
                  code: 'JP',
                  weight: 0.06258100000000001,
                  continent: 'Asia',
                  name: 'Japan'
                },
                {
                  code: 'GB',
                  weight: 0.03813600000000002,
                  continent: 'Europe',
                  name: 'United Kingdom'
                },
                {
                  code: 'FR',
                  weight: 0.027450000000000006,
                  continent: 'Europe',
                  name: 'France'
                },
                {
                  code: 'DK',
                  weight: 0.006692,
                  continent: 'Europe',
                  name: 'Denmark'
                },
                {
                  code: 'CA',
                  weight: 0.026039000000000007,
                  continent: 'North America',
                  name: 'Canada'
                },
                {
                  code: 'DE',
                  weight: 0.023266,
                  continent: 'Europe',
                  name: 'Germany'
                },
                {
                  code: 'HK',
                  weight: 0.008724999999999998,
                  continent: 'Asia',
                  name: 'Hong Kong'
                },
                {
                  code: 'AU',
                  weight: 0.019638,
                  continent: 'Oceania',
                  name: 'Australia'
                },
                {
                  code: 'IN',
                  weight: 0.015436000000000004,
                  continent: 'Asia',
                  name: 'India'
                },
                {
                  code: 'ES',
                  weight: 0.006828,
                  continent: 'Europe',
                  name: 'Spain'
                },
                {
                  code: 'IT',
                  weight: 0.006168,
                  continent: 'Europe',
                  name: 'Italy'
                },
                {
                  code: 'BR',
                  weight: 0.004955,
                  continent: 'South America',
                  name: 'Brazil'
                },
                {
                  code: 'RU',
                  weight: 0.0038099999999999996,
                  continent: 'Asia',
                  name: 'Russia'
                },
                {
                  code: 'SA',
                  weight: 0.0038950000000000005,
                  continent: 'Asia',
                  name: 'Saudi Arabia'
                },
                {
                  code: 'BE',
                  weight: 0.0026820000000000004,
                  continent: 'Europe',
                  name: 'Belgium'
                },
                {
                  code: 'SG',
                  weight: 0.0035050000000000003,
                  continent: 'Asia',
                  name: 'Singapore'
                },
                {
                  code: 'SE',
                  weight: 0.010147999999999997,
                  continent: 'Europe',
                  name: 'Sweden'
                },
                {
                  code: 'QA',
                  weight: 0.000719,
                  continent: 'Asia',
                  name: 'Qatar'
                },
                {
                  code: 'LU',
                  weight: 0.000915,
                  continent: 'Europe',
                  name: 'Luxembourg'
                },
                {
                  code: 'ZA',
                  weight: 0.003598,
                  continent: 'Africa',
                  name: 'South Africa'
                },
                {
                  code: 'MX',
                  weight: 0.002607,
                  continent: 'North America',
                  name: 'Mexico'
                },
                {
                  code: 'FI',
                  weight: 0.002973,
                  continent: 'Europe',
                  name: 'Finland'
                },
                {
                  code: 'IE',
                  weight: 0.0017519999999999999,
                  continent: 'Europe',
                  name: 'Ireland'
                },
                {
                  code: 'KW',
                  weight: 0.0008320000000000001,
                  continent: 'Asia',
                  name: 'Kuwait'
                },
                {
                  code: 'MY',
                  weight: 0.0016229999999999999,
                  continent: 'Asia',
                  name: 'Malaysia'
                },
                {
                  code: 'ID',
                  weight: 0.001611,
                  continent: 'Asia',
                  name: 'Indonesia'
                },
                {
                  code: 'PT',
                  weight: 0.000436,
                  continent: 'Europe',
                  name: 'Portugal'
                },
                {
                  code: 'AE',
                  weight: 0.0011489999999999998,
                  continent: 'Asia',
                  name: 'United Arab Emirates'
                },
                {
                  code: 'TH',
                  weight: 0.0024800000000000004,
                  continent: 'Asia',
                  name: 'Thailand'
                },
                {
                  code: 'NO',
                  weight: 0.001652,
                  continent: 'Europe',
                  name: 'Norway'
                },
                {
                  code: 'PH',
                  weight: 0.000382,
                  continent: 'Asia',
                  name: 'Philippines'
                },
                {
                  code: 'NZ',
                  weight: 0.000652,
                  continent: 'Oceania',
                  name: 'New Zealand'
                },
                {
                  code: 'IL',
                  weight: 0.0016950000000000001,
                  continent: 'Asia',
                  name: 'Israel'
                },
                {
                  code: 'PE',
                  weight: 0.000334,
                  continent: 'South America',
                  name: 'Peru'
                },
                {
                  code: 'AT',
                  weight: 0.0008210000000000001,
                  continent: 'Europe',
                  name: 'Austria'
                },
                {
                  code: 'CL',
                  weight: 0.000298,
                  continent: 'South America',
                  name: 'Chile'
                },
                {
                  code: 'HU',
                  weight: 0.000266,
                  continent: 'Europe',
                  name: 'Hungary'
                },
                {
                  code: 'PL',
                  weight: 0.000253,
                  continent: 'Europe',
                  name: 'Poland'
                }
              ],
              dataSource: 'YAHOO',
              dateOfFirstActivity: '2018-02-28T23:00:00.000Z',
              dividend: 0,
              grossPerformance: 4534.60577952194,
              grossPerformancePercent: 0.3683200415015591,
              grossPerformancePercentWithCurrencyEffect: 0.5806366182968891,
              grossPerformanceWithCurrencyEffect: 6402.248165662604,
              holdings: [
                {
                  allocationInPercentage: 0.042520261085,
                  name: 'APPLE INC',
                  valueInBaseCurrency: 981.3336460398625
                },
                {
                  allocationInPercentage: 0.037017038038,
                  name: 'MICROSOFT CORP',
                  valueInBaseCurrency: 854.3236559815404
                },
                {
                  allocationInPercentage: 0.018861883836,
                  name: 'AMAZON COM INC',
                  valueInBaseCurrency: 435.31720557783655
                },
                {
                  allocationInPercentage: 0.017806548325,
                  name: 'NVIDIA CORP',
                  valueInBaseCurrency: 410.9609053487602
                },
                {
                  allocationInPercentage: 0.012188534864,
                  name: 'ALPHABET INC CLASS A',
                  valueInBaseCurrency: 281.3016442693628
                },
                {
                  allocationInPercentage: 0.010831709166,
                  name: 'ALPHABET INC CLASS C',
                  valueInBaseCurrency: 249.98719145833246
                },
                {
                  allocationInPercentage: 0.010813551981,
                  name: 'TESLA INC',
                  valueInBaseCurrency: 249.56813813873381
                },
                {
                  allocationInPercentage: 0.009934819182,
                  name: 'FACEBOOK CLASS A  INC',
                  valueInBaseCurrency: 229.28768737165962
                },
                {
                  allocationInPercentage: 0.007403227621000001,
                  name: 'BERKSHIRE HATHAWAY INC CLASS B',
                  valueInBaseCurrency: 170.8605772494153
                },
                {
                  allocationInPercentage: 0.007076883908,
                  name: 'ELI LILLY',
                  valueInBaseCurrency: 163.32882514892185
                },
                {
                  allocationInPercentage: 0.006844271583,
                  name: 'EXXON MOBIL CORP',
                  valueInBaseCurrency: 157.96031857861325
                },
                {
                  allocationInPercentage: 0.006718061670999999,
                  name: 'UNITEDHEALTH GROUP INC',
                  valueInBaseCurrency: 155.0474946695187
                },
                {
                  allocationInPercentage: 0.006456949621,
                  name: 'JPMORGAN CHASE & CO',
                  valueInBaseCurrency: 149.02123722158794
                },
                {
                  allocationInPercentage: 0.006293890054,
                  name: 'TAIWAN SEMICONDUCTOR MANUFACTURING',
                  valueInBaseCurrency: 145.25795272326576
                },
                {
                  allocationInPercentage: 0.00600392555,
                  name: 'VISA INC CLASS A',
                  valueInBaseCurrency: 138.56580369427397
                }
              ],
              investment: 0.13346122254229614,
              name: 'Vanguard FTSE All-World UCITS ETF',
              netPerformance: 4438.993935069568,
              netPerformancePercent: 0.3605540392890248,
              netPerformancePercentWithCurrencyEffect: 0.5382257513306911,
              netPerformanceWithCurrencyEffect: 6316.200702182656,
              quantity: 165,
              sectors: [
                { name: 'Technology', weight: 0.2729529999999999 },
                { name: 'Consumer Cyclical', weight: 0.141791 },
                { name: 'Financials', weight: 0.14711999999999992 },
                { name: 'Healthcare', weight: 0.114531 },
                { name: 'Consumer Staples', weight: 0.064498 },
                { name: 'Energy', weight: 0.036378999999999995 },
                { name: 'Telecommunications', weight: 0.017739000000000008 },
                { name: 'Utilities', weight: 0.02524900000000001 },
                { name: 'Industrials', weight: 0.095292 },
                { name: 'Materials', weight: 0.04762400000000001 },
                { name: 'Real Estate', weight: 0.027565000000000003 },
                { name: 'Communication', weight: 0.0035989999999999998 },
                { name: 'Information & Communication', weight: 0.000576 },
                { name: 'Communication Services', weight: 0.000574 },
                { name: 'Electric Appliances', weight: 0.000345 },
                { name: 'Chemicals', weight: 0.000326 },
                { name: 'Services', weight: 0.000257 },
                {
                  name: 'Transportation Equipment',
                  weight: 0.00041299999999999996
                }
              ],
              url: 'https://www.vanguard.com',
              valueInBaseCurrency: 23079.20085622547,
              valueInPercentage: 0.145162408515095
            },
            'XDWD.DE': {
              currency: 'EUR',
              markets: {
                UNKNOWN: 0,
                developedMarkets: 0.9688723314999987,
                emergingMarkets: 0,
                otherMarkets: 0
              },
              marketsAdvanced: {
                UNKNOWN: 0,
                asiaPacific: 0.0288497227,
                emergingMarkets: 0,
                europe: 0.1665952994,
                japan: 0.060962362,
                northAmerica: 0.7124649473999988,
                otherMarkets: 0
              },
              marketPrice: 105.72,
              symbol: 'XDWD.DE',
              tags: [],
              transactionCount: 1,
              allocationInPercentage: 0.03598477442100562,
              assetClass: 'EQUITY',
              assetSubClass: 'ETF',
              countries: [
                {
                  code: 'US',
                  weight: 0.6842147911999988,
                  continent: 'North America',
                  name: 'United States'
                },
                {
                  code: 'SG',
                  weight: 0.0035432595,
                  continent: 'Asia',
                  name: 'Singapore'
                },
                {
                  code: 'NZ',
                  weight: 0.0006406316,
                  continent: 'Oceania',
                  name: 'New Zealand'
                },
                {
                  code: 'NL',
                  weight: 0.0120495328,
                  continent: 'Europe',
                  name: 'Netherlands'
                },
                {
                  code: 'JP',
                  weight: 0.060962362,
                  continent: 'Asia',
                  name: 'Japan'
                },
                {
                  code: 'IT',
                  weight: 0.007030094800000001,
                  continent: 'Europe',
                  name: 'Italy'
                },
                {
                  code: 'FR',
                  weight: 0.0320340333,
                  continent: 'Europe',
                  name: 'France'
                },
                {
                  code: 'ES',
                  weight: 0.006727091600000001,
                  continent: 'Europe',
                  name: 'Spain'
                },
                {
                  code: 'CA',
                  weight: 0.0282501562,
                  continent: 'North America',
                  name: 'Canada'
                },
                {
                  code: 'BE',
                  weight: 0.0026160271,
                  continent: 'Europe',
                  name: 'Belgium'
                },
                {
                  code: 'AU',
                  weight: 0.0183846018,
                  continent: 'Oceania',
                  name: 'Australia'
                },
                {
                  code: 'AT',
                  weight: 0.0004905628,
                  continent: 'Europe',
                  name: 'Austria'
                },
                {
                  code: 'GB',
                  weight: 0.03339169199999999,
                  continent: 'Europe',
                  name: 'United Kingdom'
                },
                {
                  code: 'DE',
                  weight: 0.0221912394,
                  continent: 'Europe',
                  name: 'Germany'
                },
                {
                  code: 'SE',
                  weight: 0.006880960399999999,
                  continent: 'Europe',
                  name: 'Sweden'
                },
                {
                  code: 'CH',
                  weight: 0.0262900458,
                  continent: 'Europe',
                  name: 'Switzerland'
                },
                {
                  code: 'IL',
                  weight: 0.001658592,
                  continent: 'Asia',
                  name: 'Israel'
                },
                {
                  code: 'HK',
                  weight: 0.0062812298,
                  continent: 'Asia',
                  name: 'Hong Kong'
                },
                {
                  code: 'FI',
                  weight: 0.0023597206,
                  continent: 'Europe',
                  name: 'Finland'
                },
                {
                  code: 'DK',
                  weight: 0.0087064137,
                  continent: 'Europe',
                  name: 'Denmark'
                },
                {
                  code: 'NO',
                  weight: 0.0014517355,
                  continent: 'Europe',
                  name: 'Norway'
                },
                {
                  code: 'PT',
                  weight: 0.0004820743,
                  continent: 'Europe',
                  name: 'Portugal'
                },
                {
                  code: 'IE',
                  weight: 0.0022354833,
                  continent: 'Europe',
                  name: 'Ireland'
                }
              ],
              dataSource: 'YAHOO',
              dateOfFirstActivity: '2021-08-18T22:00:00.000Z',
              dividend: 0,
              grossPerformance: 2281.298817228297,
              grossPerformancePercent: 0.3474381850624522,
              grossPerformancePercentWithCurrencyEffect: 0.28744846894552306,
              grossPerformanceWithCurrencyEffect: 1975.348026988124,
              holdings: [
                {
                  allocationInPercentage: 0.051778373,
                  name: 'APPLE INC',
                  valueInBaseCurrency: 458.1016731945994
                },
                {
                  allocationInPercentage: 0.0403267055,
                  name: 'MICROSOFT CORP',
                  valueInBaseCurrency: 356.78469974280296
                },
                {
                  allocationInPercentage: 0.0221895862,
                  name: 'AMAZON COM INC',
                  valueInBaseCurrency: 196.3191575315778
                },
                {
                  allocationInPercentage: 0.0208100035,
                  name: 'NVIDIA CORP',
                  valueInBaseCurrency: 184.1134989416425
                },
                {
                  allocationInPercentage: 0.0139820061,
                  name: 'ALPHABET INC CLASS A',
                  valueInBaseCurrency: 123.70377858390985
                },
                {
                  allocationInPercentage: 0.0126263246,
                  name: 'ALPHABET INC CLASS C',
                  valueInBaseCurrency: 111.70958240727516
                },
                {
                  allocationInPercentage: 0.0121596126,
                  name: 'TESLA INC',
                  valueInBaseCurrency: 107.58041542669048
                },
                {
                  allocationInPercentage: 0.0114079282,
                  name: 'FACEBOOK CLASS A  INC',
                  valueInBaseCurrency: 100.92999631533141
                },
                {
                  allocationInPercentage: 0.0081570352,
                  name: 'BERKSHIRE HATHAWAY INC CLASS B',
                  valueInBaseCurrency: 72.16819024860523
                },
                {
                  allocationInPercentage: 0.0079471416,
                  name: 'EXXON MOBIL CORP',
                  valueInBaseCurrency: 70.31118695201964
                },
                {
                  allocationInPercentage: 0.0078190388,
                  name: 'ELI LILLY',
                  valueInBaseCurrency: 69.1778159397456
                },
                {
                  allocationInPercentage: 0.0077121293,
                  name: 'UNITEDHEALTH GROUP INC',
                  valueInBaseCurrency: 68.23194958681098
                },
                {
                  allocationInPercentage: 0.0074484861,
                  name: 'JPMORGAN CHASE & CO',
                  valueInBaseCurrency: 65.89940447098863
                },
                {
                  allocationInPercentage: 0.006978079,
                  name: 'VISA INC CLASS A',
                  valueInBaseCurrency: 61.73754562709217
                }
              ],
              investment: 0.04725441287200783,
              name: 'Xtrackers MSCI World UCITS ETF 1C',
              netPerformance: 2247.935728632002,
              netPerformancePercent: 0.3423570396805166,
              netPerformancePercentWithCurrencyEffect: 0.28236732356358746,
              netPerformanceWithCurrencyEffect: 1940.4303579469001,
              quantity: 75,
              sectors: [
                { name: 'Real Estate', weight: 0.0227030317 },
                { name: 'Telecommunications', weight: 0.0121560434 },
                { name: 'Consumer Cyclical', weight: 0.11961483 },
                { name: 'Technology', weight: 0.2874777003999999 },
                { name: 'Financials', weight: 0.1235808743 },
                { name: 'Healthcare', weight: 0.1235932822 },
                { name: 'Consumer Staples', weight: 0.0678151631 },
                { name: 'Industrials', weight: 0.100454506 },
                { name: 'Materials', weight: 0.03695810040000001 },
                { name: 'Energy', weight: 0.0446714376 },
                { name: 'Utilities', weight: 0.02511086069999999 },
                { name: 'Communication', weight: 0.0019910151 },
                { name: 'Chemicals', weight: 0.0002828541 },
                { name: 'Information & Communication', weight: 0.0007891258 },
                { name: 'Banks', weight: 0.0002609199 },
                { name: 'Land Transportation', weight: 0.0001578684 },
                { name: 'Electric Appliances', weight: 0.0005693792 },
                { name: 'Transportation Equipment', weight: 0.000423318 },
                { name: 'Metal Products', weight: 0.0000542923 },
                { name: 'Real Estate ex REIT', weight: 0.0000483797 },
                { name: 'Wholesale Trade', weight: 0.0000686654 },
                { name: 'Other Financing Business', weight: 0.0000906838 }
              ],
              url: null,
              valueInBaseCurrency: 8847.35550100424,
              valueInPercentage: 0.055647656152211074
            },
            USD: {
              currency: 'USD',
              allocationInPercentage: 0.20291717628620132,
              assetClass: 'LIQUIDITY',
              assetSubClass: 'CASH',
              countries: [],
              dividend: 0,
              grossPerformance: 0,
              grossPerformancePercent: 0,
              grossPerformancePercentWithCurrencyEffect: 0,
              grossPerformanceWithCurrencyEffect: 0,
              holdings: [],
              investment: 0.35904695492648864,
              marketPrice: 0,
              name: 'USD',
              netPerformance: 0,
              netPerformancePercent: 0,
              netPerformancePercentWithCurrencyEffect: 0,
              netPerformanceWithCurrencyEffect: 0,
              quantity: 0,
              sectors: [],
              symbol: 'USD',
              tags: [],
              transactionCount: 0,
              valueInBaseCurrency: 49890,
              valueInPercentage: 0.3137956381563603
            }
          },
          platforms: {
            'a5b14588-49a0-48e4-b9f7-e186b27860b7': {
              balance: 0,
              currency: 'EUR',
              name: 'Bondora',
              valueInBaseCurrency: 2231.644722160232,
              valueInPercentage: 0.014036487867880205
            },
            '8dc24b88-bb92-4152-af25-fe6a31643e26': {
              balance: 390,
              currency: 'USD',
              name: 'Coinbase',
              valueInBaseCurrency: 37375.033270399996,
              valueInPercentage: 0.23507962349569783
            },
            '94c1a2f4-a666-47be-84cd-4c8952e74c81': {
              balance: 0,
              currency: 'EUR',
              name: 'DEGIRO',
              valueInBaseCurrency: 90452.98295843479,
              valueInPercentage: 0.5689266688833119
            },
            '9da3a8a7-4795-43e3-a6db-ccb914189737': {
              balance: 0,
              currency: 'USD',
              name: 'Interactive Brokers',
              valueInBaseCurrency: 43941,
              valueInPercentage: 0.27637791413567103
            },
            'cbbb4642-1f1e-412d-91a7-27ed695a048d': {
              balance: 0,
              currency: 'CHF',
              name: 'frankly',
              valueInBaseCurrency: 22363.19795483481,
              valueInPercentage: 0.14065892911313693
            },
            '43e8fcd1-5b79-4100-b678-d2229bd1660d': {
              balance: 47500,
              currency: 'USD',
              name: 'J.P. Morgan',
              valueInBaseCurrency: 47500,
              valueInPercentage: 0.2987631351458632
            },
            '747b9016-8ba1-4d13-8255-aec49a468ead': {
              balance: 2000,
              currency: 'USD',
              name: 'Revolut',
              valueInBaseCurrency: 2000,
              valueInPercentage: 0.01257950042719424
            }
          },
          summary: {
            annualizedPerformancePercent: 0.16690880197786,
            annualizedPerformancePercentWithCurrencyEffect: 0.1694019484552876,
            cash: null,
            excludedAccountsAndActivities: null,
            netPerformance: null,
            netPerformancePercentage: 2.3039314216696174,
            netPerformancePercentageWithCurrencyEffect: 2.3589806001456606,
            netPerformanceWithCurrencyEffect: null,
            totalBuy: null,
            totalSell: null,
            committedFunds: null,
            currentValueInBaseCurrency: null,
            dividendInBaseCurrency: null,
            emergencyFund: null,
            fees: null,
            filteredValueInBaseCurrency: null,
            filteredValueInPercentage: 0.9646870292294938,
            fireWealth: null,
            grossPerformance: null,
            grossPerformanceWithCurrencyEffect: null,
            interest: null,
            items: null,
            liabilities: null,
            ordersCount: 29,
            totalInvestment: null,
            totalValueInBaseCurrency: null,
            currentNetWorth: null
          }
        },
        options: [
          'balance',
          'balanceInBaseCurrency',
          'comment',
          'convertedBalance',
          'dividendInBaseCurrency',
          'fee',
          'feeInBaseCurrency',
          'grossPerformance',
          'grossPerformanceWithCurrencyEffect',
          'investment',
          'netPerformance',
          'netPerformanceWithCurrencyEffect',
          'quantity',
          'symbolMapping',
          'totalBalanceInBaseCurrency',
          'totalValueInBaseCurrency',
          'unitPrice',
          'value',
          'valueInBaseCurrency'
        ].map((attribute) => {
          return {
            attribute,
            valueMap: {
              '*': null
            }
          };
        })
      })
    ).toStrictEqual({
      accounts: {
        '2e937c05-657c-4de9-8fb3-0813a2245f26': {
          balance: null,
          currency: 'EUR',
          name: 'Bondora Account',
          valueInBaseCurrency: null,
          valueInPercentage: 0.014036487867880205
        },
        'd804de69-0429-42dc-b6ca-b308fd7dd926': {
          balance: null,
          currency: 'USD',
          name: 'Coinbase Account',
          valueInBaseCurrency: null,
          valueInPercentage: 0.23507962349569783
        },
        '65cfb79d-b6c7-4591-9d46-73426bc62094': {
          balance: null,
          currency: 'EUR',
          name: 'DEGIRO Account',
          valueInBaseCurrency: null,
          valueInPercentage: 0.5689266688833119
        },
        '480269ce-e12a-4fd1-ac88-c4b0ff3f899c': {
          balance: null,
          currency: 'USD',
          name: 'Interactive Brokers Account',
          valueInBaseCurrency: null,
          valueInPercentage: 0.27637791413567103
        },
        '123eafcb-362e-4320-92c5-324621014ee5': {
          balance: null,
          currency: 'CHF',
          name: 'Pillar 3a 🇨🇭',
          valueInBaseCurrency: null,
          valueInPercentage: 0.14065892911313693
        },
        '8c623328-6035-4b5f-b6d5-702cc1c9c56b': {
          balance: null,
          currency: 'USD',
          name: 'Private Banking Account',
          valueInBaseCurrency: null,
          valueInPercentage: 0.2987631351458632
        },
        '206b2330-25a5-4d0a-b84b-c7194828f3c7': {
          balance: null,
          currency: 'USD',
          name: 'Revolut Account',
          valueInBaseCurrency: null,
          valueInPercentage: 0.01257950042719424
        }
      },
      hasError: false,
      holdings: {
        'AAPL.US': {
          currency: 'USD',
          markets: {
            UNKNOWN: 0,
            developedMarkets: 1,
            emergingMarkets: 0,
            otherMarkets: 0
          },
          marketsAdvanced: {
            UNKNOWN: 0,
            asiaPacific: 0,
            emergingMarkets: 0,
            europe: 0,
            japan: 0,
            northAmerica: 1,
            otherMarkets: 0
          },
          marketPrice: 220.79,
          symbol: 'AAPL.US',
          tags: [],
          transactionCount: 1,
          allocationInPercentage: 0.044900865255793135,
          assetClass: 'EQUITY',
          assetSubClass: 'STOCK',
          countries: [
            {
              code: 'US',
              weight: 1,
              continent: 'North America',
              name: 'United States'
            }
          ],
          dataSource: 'EOD_HISTORICAL_DATA',
          dateOfFirstActivity: '2021-11-30T23:00:00.000Z',
          dividend: 0,
          grossPerformance: null,
          grossPerformancePercent: 0.3183066634822068,
          grossPerformancePercentWithCurrencyEffect: 0.3183066634822068,
          grossPerformanceWithCurrencyEffect: null,
          holdings: [],
          investment: null,
          name: 'Apple Inc',
          netPerformance: null,
          netPerformancePercent: 0.3181872462383568,
          netPerformancePercentWithCurrencyEffect: 0.3181872462383568,
          netPerformanceWithCurrencyEffect: null,
          quantity: null,
          sectors: [{ name: 'Technology', weight: 1 }],
          url: 'https://www.apple.com',
          valueInBaseCurrency: null,
          valueInPercentage: 0.0694356974830054
        },
        'ALV.DE': {
          currency: 'EUR',
          markets: {
            UNKNOWN: 0,
            developedMarkets: 1,
            emergingMarkets: 0,
            otherMarkets: 0
          },
          marketsAdvanced: {
            UNKNOWN: 0,
            asiaPacific: 0,
            emergingMarkets: 0,
            europe: 1,
            japan: 0,
            northAmerica: 0,
            otherMarkets: 0
          },
          marketPrice: 296.5,
          symbol: 'ALV.DE',
          tags: [],
          transactionCount: 2,
          allocationInPercentage: 0.026912563036519527,
          assetClass: 'EQUITY',
          assetSubClass: 'STOCK',
          countries: [
            { code: 'DE', weight: 1, continent: 'Europe', name: 'Germany' }
          ],
          dataSource: 'YAHOO',
          dateOfFirstActivity: '2021-04-22T22:00:00.000Z',
          dividend: 192,
          grossPerformance: null,
          grossPerformancePercent: 0.3719230057375532,
          grossPerformancePercentWithCurrencyEffect: 0.2650716044872953,
          grossPerformanceWithCurrencyEffect: null,
          holdings: [],
          investment: null,
          name: 'Allianz SE',
          netPerformance: null,
          netPerformancePercent: 0.3709513233388858,
          netPerformancePercentWithCurrencyEffect: 0.26409992208862787,
          netPerformanceWithCurrencyEffect: null,
          quantity: null,
          sectors: [{ name: 'Financial Services', weight: 1 }],
          url: 'https://www.allianz.com',
          valueInBaseCurrency: null,
          valueInPercentage: 0.04161818652826481
        },
        AMZN: {
          currency: 'USD',
          markets: {
            UNKNOWN: 0,
            developedMarkets: 1,
            emergingMarkets: 0,
            otherMarkets: 0
          },
          marketsAdvanced: {
            UNKNOWN: 0,
            asiaPacific: 0,
            emergingMarkets: 0,
            europe: 0,
            japan: 0,
            northAmerica: 1,
            otherMarkets: 0
          },
          marketPrice: 187.99,
          symbol: 'AMZN',
          tags: [],
          transactionCount: 1,
          allocationInPercentage: 0.07646101417126275,
          assetClass: 'EQUITY',
          assetSubClass: 'STOCK',
          countries: [
            {
              code: 'US',
              weight: 1,
              continent: 'North America',
              name: 'United States'
            }
          ],
          dataSource: 'YAHOO',
          dateOfFirstActivity: '2018-09-30T22:00:00.000Z',
          dividend: 0,
          grossPerformance: null,
          grossPerformancePercent: 0.8594552890963852,
          grossPerformancePercentWithCurrencyEffect: 0.8594552890963852,
          grossPerformanceWithCurrencyEffect: null,
          holdings: [],
          investment: null,
          name: 'Amazon.com, Inc.',
          netPerformance: null,
          netPerformancePercent: 0.8514641516525799,
          netPerformancePercentWithCurrencyEffect: 0.8514641516525799,
          netPerformanceWithCurrencyEffect: null,
          quantity: null,
          sectors: [{ name: 'Consumer Cyclical', weight: 1 }],
          url: 'https://www.aboutamazon.com',
          valueInBaseCurrency: null,
          valueInPercentage: 0.11824101426541227
        },
        bitcoin: {
          currency: 'USD',
          markets: {
            UNKNOWN: 36985.0332704,
            developedMarkets: 0,
            emergingMarkets: 0,
            otherMarkets: 0
          },
          marketsAdvanced: {
            UNKNOWN: 36985.0332704,
            asiaPacific: 0,
            emergingMarkets: 0,
            europe: 0,
            japan: 0,
            northAmerica: 0,
            otherMarkets: 0
          },
          marketPrice: 65872,
          symbol: 'bitcoin',
          tags: [
            {
              id: '795ebca3-6777-4325-b7ff-f55d94f460fe',
              name: 'HIGHER_RISK',
              userId: null
            }
          ],
          transactionCount: 1,
          allocationInPercentage: 0.15042891393226654,
          assetClass: 'LIQUIDITY',
          assetSubClass: 'CRYPTOCURRENCY',
          countries: [],
          dataSource: 'COINGECKO',
          dateOfFirstActivity: '2017-08-15T22:00:00.000Z',
          dividend: 0,
          grossPerformance: null,
          grossPerformancePercent: 17.4925166352,
          grossPerformancePercentWithCurrencyEffect: 17.4925166352,
          grossPerformanceWithCurrencyEffect: null,
          holdings: [],
          investment: null,
          name: 'Bitcoin',
          netPerformance: null,
          netPerformancePercent: 17.477566635200002,
          netPerformancePercentWithCurrencyEffect: 17.477566635200002,
          netPerformanceWithCurrencyEffect: null,
          quantity: null,
          sectors: [],
          url: null,
          valueInBaseCurrency: null,
          valueInPercentage: 0.232626620912395
        },
        BONDORA_GO_AND_GROW: {
          currency: 'EUR',
          markets: {
            UNKNOWN: 2231.644722160232,
            developedMarkets: 0,
            emergingMarkets: 0,
            otherMarkets: 0
          },
          marketsAdvanced: {
            UNKNOWN: 2231.644722160232,
            asiaPacific: 0,
            emergingMarkets: 0,
            europe: 0,
            japan: 0,
            northAmerica: 0,
            otherMarkets: 0
          },
          marketPrice: 1,
          symbol: 'BONDORA_GO_AND_GROW',
          tags: [
            {
              id: '795ebca3-6777-4325-b7ff-f55d94f460fe',
              name: 'HIGHER_RISK',
              userId: null
            }
          ],
          transactionCount: 5,
          allocationInPercentage: 0.009076749759365777,
          assetClass: 'FIXED_INCOME',
          assetSubClass: 'BOND',
          countries: [],
          dataSource: 'MANUAL',
          dateOfFirstActivity: '2021-01-31T23:00:00.000Z',
          dividend: 11.45,
          grossPerformance: null,
          grossPerformancePercent: 0,
          grossPerformancePercentWithCurrencyEffect: -0.06153834320225245,
          grossPerformanceWithCurrencyEffect: null,
          holdings: [],
          investment: null,
          name: 'Bondora Go & Grow',
          netPerformance: null,
          netPerformancePercent: 0,
          netPerformancePercentWithCurrencyEffect: -0.06118537471467475,
          netPerformanceWithCurrencyEffect: null,
          quantity: null,
          sectors: [],
          url: null,
          valueInBaseCurrency: null,
          valueInPercentage: 0.014036487867880205
        },
        FRANKLY95P: {
          currency: 'CHF',
          markets: {
            UNKNOWN: 0,
            developedMarkets: 0.79567,
            emergingMarkets: 0.07075,
            otherMarkets: 0
          },
          marketsAdvanced: {
            UNKNOWN: 0,
            asiaPacific: 0.01333,
            emergingMarkets: 0.07075,
            europe: 0.35204,
            japan: 0.03925,
            northAmerica: 0.39105,
            otherMarkets: 0
          },
          marketPrice: 177.62,
          symbol: 'FRANKLY95P',
          tags: [
            {
              id: '6caface3-cb98-4605-a357-03792b6746c6',
              name: 'RETIREMENT_PROVISION',
              userId: null
            }
          ],
          transactionCount: 6,
          allocationInPercentage: 0.09095764645669335,
          assetClass: 'EQUITY',
          assetSubClass: 'ETF',
          countries: [
            {
              code: 'US',
              weight: 0.37292,
              continent: 'North America',
              name: 'United States'
            },
            {
              code: 'CH',
              weight: 0.30022,
              continent: 'Europe',
              name: 'Switzerland'
            },
            { code: 'JP', weight: 0.03925, continent: 'Asia', name: 'Japan' },
            { code: 'CN', weight: 0.03353, continent: 'Asia', name: 'China' },
            {
              code: 'GB',
              weight: 0.02285,
              continent: 'Europe',
              name: 'United Kingdom'
            },
            {
              code: 'CA',
              weight: 0.01813,
              continent: 'North America',
              name: 'Canada'
            },
            {
              code: 'FR',
              weight: 0.01465,
              continent: 'Europe',
              name: 'France'
            },
            {
              code: 'DE',
              weight: 0.01432,
              continent: 'Europe',
              name: 'Germany'
            },
            { code: 'TW', weight: 0.01427, continent: 'Asia', name: 'Taiwan' },
            {
              code: 'AU',
              weight: 0.01333,
              continent: 'Oceania',
              name: 'Australia'
            },
            {
              code: 'KR',
              weight: 0.01172,
              continent: 'Asia',
              name: 'South Korea'
            },
            { code: 'IN', weight: 0.01123, continent: 'Asia', name: 'India' }
          ],
          dataSource: 'MANUAL',
          dateOfFirstActivity: '2021-03-31T22:00:00.000Z',
          dividend: 0,
          grossPerformance: null,
          grossPerformancePercent: 0.27579517683678895,
          grossPerformancePercentWithCurrencyEffect: 0.458553421589667,
          grossPerformanceWithCurrencyEffect: null,
          holdings: [],
          investment: null,
          name: 'frankly Extreme 95 Index',
          netPerformance: null,
          netPerformancePercent: 0.27579517683678895,
          netPerformancePercentWithCurrencyEffect: 0.43609380217769156,
          netPerformanceWithCurrencyEffect: null,
          quantity: null,
          sectors: [],
          url: 'https://www.frankly.ch',
          valueInBaseCurrency: null,
          valueInPercentage: 0.14065892911313693
        },
        MSFT: {
          currency: 'USD',
          markets: {
            UNKNOWN: 0,
            developedMarkets: 1,
            emergingMarkets: 0,
            otherMarkets: 0
          },
          marketsAdvanced: {
            UNKNOWN: 0,
            asiaPacific: 0,
            emergingMarkets: 0,
            europe: 0,
            japan: 0,
            northAmerica: 1,
            otherMarkets: 0
          },
          marketPrice: 428.02,
          symbol: 'MSFT',
          tags: [],
          transactionCount: 1,
          allocationInPercentage: 0.05222646409742627,
          assetClass: 'EQUITY',
          assetSubClass: 'STOCK',
          countries: [
            {
              code: 'US',
              weight: 1,
              continent: 'North America',
              name: 'United States'
            }
          ],
          dataSource: 'YAHOO',
          dateOfFirstActivity: '2023-01-02T23:00:00.000Z',
          dividend: 0,
          grossPerformance: null,
          grossPerformancePercent: 0.7865431171216295,
          grossPerformancePercentWithCurrencyEffect: 0.7865431171216295,
          grossPerformanceWithCurrencyEffect: null,
          holdings: [],
          investment: null,
          name: 'Microsoft Corporation',
          netPerformance: null,
          netPerformancePercent: 0.7865431171216295,
          netPerformancePercentWithCurrencyEffect: 0.7865431171216295,
          netPerformanceWithCurrencyEffect: null,
          quantity: null,
          sectors: [{ name: 'Technology', weight: 1 }],
          url: 'https://www.microsoft.com',
          valueInBaseCurrency: null,
          valueInPercentage: 0.08076416659271518
        },
        TSLA: {
          currency: 'USD',
          markets: {
            UNKNOWN: 0,
            developedMarkets: 1,
            emergingMarkets: 0,
            otherMarkets: 0
          },
          marketsAdvanced: {
            UNKNOWN: 0,
            asiaPacific: 0,
            emergingMarkets: 0,
            europe: 0,
            japan: 0,
            northAmerica: 1,
            otherMarkets: 0
          },
          marketPrice: 260.46,
          symbol: 'TSLA',
          tags: [],
          transactionCount: 1,
          allocationInPercentage: 0.1589050142378352,
          assetClass: 'EQUITY',
          assetSubClass: 'STOCK',
          countries: [
            {
              code: 'US',
              weight: 1,
              continent: 'North America',
              name: 'United States'
            }
          ],
          dataSource: 'YAHOO',
          dateOfFirstActivity: '2017-01-02T23:00:00.000Z',
          dividend: 0,
          grossPerformance: null,
          grossPerformancePercent: 17.184314638161936,
          grossPerformancePercentWithCurrencyEffect: 17.184314638161936,
          grossPerformanceWithCurrencyEffect: null,
          holdings: [],
          investment: null,
          name: 'Tesla, Inc.',
          netPerformance: null,
          netPerformancePercent: 17.170351408001327,
          netPerformancePercentWithCurrencyEffect: 17.170351408001327,
          netPerformanceWithCurrencyEffect: null,
          quantity: null,
          sectors: [{ name: 'Consumer Cyclical', weight: 1 }],
          url: 'https://www.tesla.com',
          valueInBaseCurrency: null,
          valueInPercentage: 0.2457342510950259
        },
        VTI: {
          currency: 'USD',
          markets: {
            UNKNOWN: 0,
            developedMarkets: 0.9794119422809896,
            emergingMarkets: 0,
            otherMarkets: 0.00016100142888768383
          },
          marketsAdvanced: {
            UNKNOWN: 0,
            asiaPacific: 0,
            emergingMarkets: 0,
            europe: 0.00019118919680412454,
            japan: 0,
            northAmerica: 0.9792207530841855,
            otherMarkets: 0.00016100142888768383
          },
          marketPrice: 282.05,
          symbol: 'VTI',
          tags: [],
          transactionCount: 5,
          allocationInPercentage: 0.057358979326040366,
          assetClass: 'EQUITY',
          assetSubClass: 'ETF',
          countries: [
            {
              code: 'US',
              weight: 0.9788987502264102,
              continent: 'North America',
              name: 'United States'
            },
            {
              code: 'CA',
              weight: 0.0003220028577753677,
              continent: 'North America',
              name: 'Canada'
            },
            {
              code: 'NL',
              weight: 0.0001811266074986443,
              continent: 'Europe',
              name: 'Netherlands'
            },
            {
              code: 'BM',
              weight: 0.00009056330374932214,
              continent: 'North America',
              name: 'Bermuda'
            },
            {
              code: 'KY',
              weight: 0.00007043812513836169,
              continent: 'North America',
              name: 'Cayman Islands'
            },
            {
              code: 'IL',
              weight: 0.00001006258930548024,
              continent: 'Asia',
              name: 'Israel'
            }
          ],
          dataSource: 'YAHOO',
          dateOfFirstActivity: '2019-02-28T23:00:00.000Z',
          dividend: 0,
          grossPerformance: null,
          grossPerformancePercent: 0.8832083851170418,
          grossPerformancePercentWithCurrencyEffect: 0.8832083851170418,
          grossPerformanceWithCurrencyEffect: null,
          holdings: [
            {
              allocationInPercentage: 0.06099941636982121,
              name: 'APPLE INC',
              valueInBaseCurrency: null
            },
            {
              allocationInPercentage: 0.05862464529372787,
              name: 'MICROSOFT CORP',
              valueInBaseCurrency: null
            },
            {
              allocationInPercentage: 0.05156070760128074,
              name: 'NVIDIA CORP',
              valueInBaseCurrency: null
            },
            {
              allocationInPercentage: 0.03301535551128066,
              name: 'AMAZON COM INC',
              valueInBaseCurrency: null
            },
            {
              allocationInPercentage: 0.01962204914568647,
              name: 'FACEBOOK CLASS A  INC',
              valueInBaseCurrency: null
            },
            {
              allocationInPercentage: 0.01902835637666313,
              name: 'ALPHABET INC CLASS A',
              valueInBaseCurrency: null
            },
            {
              allocationInPercentage: 0.01555676306627245,
              name: 'ALPHABET INC CLASS C',
              valueInBaseCurrency: null
            },
            {
              allocationInPercentage: 0.01463100485016827,
              name: 'BERKSHIRE HATHAWAY INC CLASS B',
              valueInBaseCurrency: null
            },
            {
              allocationInPercentage: 0.01403731208114493,
              name: 'BROADCOM INC',
              valueInBaseCurrency: null
            },
            {
              allocationInPercentage: 0.01297067761476403,
              name: 'ELI LILLY',
              valueInBaseCurrency: null
            },
            {
              allocationInPercentage: 0.0118637927911612,
              name: 'TESLA INC',
              valueInBaseCurrency: null
            },
            {
              allocationInPercentage: 0.01152166475477487,
              name: 'JPMORGAN CHASE & CO',
              valueInBaseCurrency: null
            },
            {
              allocationInPercentage: 0.0100324015375638,
              name: 'EXXON MOBIL CORP',
              valueInBaseCurrency: null
            },
            {
              allocationInPercentage: 0.01000221376964736,
              name: 'UNITEDHEALTH GROUP INC',
              valueInBaseCurrency: null
            },
            {
              allocationInPercentage: 0.007818631890358146,
              name: 'VISA INC CLASS A',
              valueInBaseCurrency: null
            }
          ],
          investment: null,
          name: 'Vanguard Total Stock Market Index Fund ETF Shares',
          netPerformance: null,
          netPerformancePercent: 0.8682024540139314,
          netPerformancePercentWithCurrencyEffect: 0.8328704068843998,
          netPerformanceWithCurrencyEffect: null,
          quantity: null,
          sectors: [
            { name: 'Technology', weight: 0.3739157560023398 },
            { name: 'Consumer Cyclical', weight: 0.1168065366580148 },
            { name: 'Industrials', weight: 0.09138843607237156 },
            { name: 'Healthcare', weight: 0.1172291654088449 },
            { name: 'Energy', weight: 0.03762402141319062 },
            { name: 'Consumer Staples', weight: 0.05152045724405886 },
            { name: 'Financials', weight: 0.1127613757572116 },
            { name: 'Telecommunications', weight: 0.007557004568415658 },
            { name: 'Real Estate', weight: 0.02587091710438972 },
            { name: 'Communication', weight: 0.002062830807623449 },
            { name: 'Utilities', weight: 0.02208738352552914 },
            { name: 'Materials', weight: 0.020366680754292 },
            { name: 'Other', weight: 0.0003823783936082492 }
          ],
          url: 'https://www.vanguard.com',
          valueInBaseCurrency: null,
          valueInPercentage: 0.08870120238725339
        },
        'VWRL.SW': {
          currency: 'CHF',
          markets: {
            UNKNOWN: 0,
            developedMarkets: 0.881487000000001,
            emergingMarkets: 0.11228900000000001,
            otherMarkets: 0.0038099999999999996
          },
          marketsAdvanced: {
            UNKNOWN: 0,
            asiaPacific: 0.03252,
            emergingMarkets: 0.11228900000000001,
            europe: 0.170033,
            japan: 0.06258100000000001,
            northAmerica: 0.6163530000000008,
            otherMarkets: 0.0038099999999999996
          },
          marketPrice: 117.62,
          symbol: 'VWRL.SW',
          tags: [],
          transactionCount: 5,
          allocationInPercentage: 0.09386983901959013,
          assetClass: 'EQUITY',
          assetSubClass: 'ETF',
          countries: [
            {
              code: 'US',
              weight: 0.5903140000000008,
              continent: 'North America',
              name: 'United States'
            },
            {
              code: 'TW',
              weight: 0.017327000000000002,
              continent: 'Asia',
              name: 'Taiwan'
            },
            {
              code: 'CN',
              weight: 0.040376999999999996,
              continent: 'Asia',
              name: 'China'
            },
            {
              code: 'CH',
              weight: 0.024700999999999997,
              continent: 'Europe',
              name: 'Switzerland'
            },
            {
              code: 'KR',
              weight: 0.014147,
              continent: 'Asia',
              name: 'South Korea'
            },
            {
              code: 'NL',
              weight: 0.013718000000000001,
              continent: 'Europe',
              name: 'Netherlands'
            },
            {
              code: 'JP',
              weight: 0.06258100000000001,
              continent: 'Asia',
              name: 'Japan'
            },
            {
              code: 'GB',
              weight: 0.03813600000000002,
              continent: 'Europe',
              name: 'United Kingdom'
            },
            {
              code: 'FR',
              weight: 0.027450000000000006,
              continent: 'Europe',
              name: 'France'
            },
            {
              code: 'DK',
              weight: 0.006692,
              continent: 'Europe',
              name: 'Denmark'
            },
            {
              code: 'CA',
              weight: 0.026039000000000007,
              continent: 'North America',
              name: 'Canada'
            },
            {
              code: 'DE',
              weight: 0.023266,
              continent: 'Europe',
              name: 'Germany'
            },
            {
              code: 'HK',
              weight: 0.008724999999999998,
              continent: 'Asia',
              name: 'Hong Kong'
            },
            {
              code: 'AU',
              weight: 0.019638,
              continent: 'Oceania',
              name: 'Australia'
            },
            {
              code: 'IN',
              weight: 0.015436000000000004,
              continent: 'Asia',
              name: 'India'
            },
            {
              code: 'ES',
              weight: 0.006828,
              continent: 'Europe',
              name: 'Spain'
            },
            {
              code: 'IT',
              weight: 0.006168,
              continent: 'Europe',
              name: 'Italy'
            },
            {
              code: 'BR',
              weight: 0.004955,
              continent: 'South America',
              name: 'Brazil'
            },
            {
              code: 'RU',
              weight: 0.0038099999999999996,
              continent: 'Asia',
              name: 'Russia'
            },
            {
              code: 'SA',
              weight: 0.0038950000000000005,
              continent: 'Asia',
              name: 'Saudi Arabia'
            },
            {
              code: 'BE',
              weight: 0.0026820000000000004,
              continent: 'Europe',
              name: 'Belgium'
            },
            {
              code: 'SG',
              weight: 0.0035050000000000003,
              continent: 'Asia',
              name: 'Singapore'
            },
            {
              code: 'SE',
              weight: 0.010147999999999997,
              continent: 'Europe',
              name: 'Sweden'
            },
            { code: 'QA', weight: 0.000719, continent: 'Asia', name: 'Qatar' },
            {
              code: 'LU',
              weight: 0.000915,
              continent: 'Europe',
              name: 'Luxembourg'
            },
            {
              code: 'ZA',
              weight: 0.003598,
              continent: 'Africa',
              name: 'South Africa'
            },
            {
              code: 'MX',
              weight: 0.002607,
              continent: 'North America',
              name: 'Mexico'
            },
            {
              code: 'FI',
              weight: 0.002973,
              continent: 'Europe',
              name: 'Finland'
            },
            {
              code: 'IE',
              weight: 0.0017519999999999999,
              continent: 'Europe',
              name: 'Ireland'
            },
            {
              code: 'KW',
              weight: 0.0008320000000000001,
              continent: 'Asia',
              name: 'Kuwait'
            },
            {
              code: 'MY',
              weight: 0.0016229999999999999,
              continent: 'Asia',
              name: 'Malaysia'
            },
            {
              code: 'ID',
              weight: 0.001611,
              continent: 'Asia',
              name: 'Indonesia'
            },
            {
              code: 'PT',
              weight: 0.000436,
              continent: 'Europe',
              name: 'Portugal'
            },
            {
              code: 'AE',
              weight: 0.0011489999999999998,
              continent: 'Asia',
              name: 'United Arab Emirates'
            },
            {
              code: 'TH',
              weight: 0.0024800000000000004,
              continent: 'Asia',
              name: 'Thailand'
            },
            {
              code: 'NO',
              weight: 0.001652,
              continent: 'Europe',
              name: 'Norway'
            },
            {
              code: 'PH',
              weight: 0.000382,
              continent: 'Asia',
              name: 'Philippines'
            },
            {
              code: 'NZ',
              weight: 0.000652,
              continent: 'Oceania',
              name: 'New Zealand'
            },
            {
              code: 'IL',
              weight: 0.0016950000000000001,
              continent: 'Asia',
              name: 'Israel'
            },
            {
              code: 'PE',
              weight: 0.000334,
              continent: 'South America',
              name: 'Peru'
            },
            {
              code: 'AT',
              weight: 0.0008210000000000001,
              continent: 'Europe',
              name: 'Austria'
            },
            {
              code: 'CL',
              weight: 0.000298,
              continent: 'South America',
              name: 'Chile'
            },
            {
              code: 'HU',
              weight: 0.000266,
              continent: 'Europe',
              name: 'Hungary'
            },
            {
              code: 'PL',
              weight: 0.000253,
              continent: 'Europe',
              name: 'Poland'
            }
          ],
          dataSource: 'YAHOO',
          dateOfFirstActivity: '2018-02-28T23:00:00.000Z',
          dividend: 0,
          grossPerformance: null,
          grossPerformancePercent: 0.3683200415015591,
          grossPerformancePercentWithCurrencyEffect: 0.5806366182968891,
          grossPerformanceWithCurrencyEffect: null,
          holdings: [
            {
              allocationInPercentage: 0.042520261085,
              name: 'APPLE INC',
              valueInBaseCurrency: null
            },
            {
              allocationInPercentage: 0.037017038038,
              name: 'MICROSOFT CORP',
              valueInBaseCurrency: null
            },
            {
              allocationInPercentage: 0.018861883836,
              name: 'AMAZON COM INC',
              valueInBaseCurrency: null
            },
            {
              allocationInPercentage: 0.017806548325,
              name: 'NVIDIA CORP',
              valueInBaseCurrency: null
            },
            {
              allocationInPercentage: 0.012188534864,
              name: 'ALPHABET INC CLASS A',
              valueInBaseCurrency: null
            },
            {
              allocationInPercentage: 0.010831709166,
              name: 'ALPHABET INC CLASS C',
              valueInBaseCurrency: null
            },
            {
              allocationInPercentage: 0.010813551981,
              name: 'TESLA INC',
              valueInBaseCurrency: null
            },
            {
              allocationInPercentage: 0.009934819182,
              name: 'FACEBOOK CLASS A  INC',
              valueInBaseCurrency: null
            },
            {
              allocationInPercentage: 0.007403227621000001,
              name: 'BERKSHIRE HATHAWAY INC CLASS B',
              valueInBaseCurrency: null
            },
            {
              allocationInPercentage: 0.007076883908,
              name: 'ELI LILLY',
              valueInBaseCurrency: null
            },
            {
              allocationInPercentage: 0.006844271583,
              name: 'EXXON MOBIL CORP',
              valueInBaseCurrency: null
            },
            {
              allocationInPercentage: 0.006718061670999999,
              name: 'UNITEDHEALTH GROUP INC',
              valueInBaseCurrency: null
            },
            {
              allocationInPercentage: 0.006456949621,
              name: 'JPMORGAN CHASE & CO',
              valueInBaseCurrency: null
            },
            {
              allocationInPercentage: 0.006293890054,
              name: 'TAIWAN SEMICONDUCTOR MANUFACTURING',
              valueInBaseCurrency: null
            },
            {
              allocationInPercentage: 0.00600392555,
              name: 'VISA INC CLASS A',
              valueInBaseCurrency: null
            }
          ],
          investment: null,
          name: 'Vanguard FTSE All-World UCITS ETF',
          netPerformance: null,
          netPerformancePercent: 0.3605540392890248,
          netPerformancePercentWithCurrencyEffect: 0.5382257513306911,
          netPerformanceWithCurrencyEffect: null,
          quantity: null,
          sectors: [
            { name: 'Technology', weight: 0.2729529999999999 },
            { name: 'Consumer Cyclical', weight: 0.141791 },
            { name: 'Financials', weight: 0.14711999999999992 },
            { name: 'Healthcare', weight: 0.114531 },
            { name: 'Consumer Staples', weight: 0.064498 },
            { name: 'Energy', weight: 0.036378999999999995 },
            { name: 'Telecommunications', weight: 0.017739000000000008 },
            { name: 'Utilities', weight: 0.02524900000000001 },
            { name: 'Industrials', weight: 0.095292 },
            { name: 'Materials', weight: 0.04762400000000001 },
            { name: 'Real Estate', weight: 0.027565000000000003 },
            { name: 'Communication', weight: 0.0035989999999999998 },
            { name: 'Information & Communication', weight: 0.000576 },
            { name: 'Communication Services', weight: 0.000574 },
            { name: 'Electric Appliances', weight: 0.000345 },
            { name: 'Chemicals', weight: 0.000326 },
            { name: 'Services', weight: 0.000257 },
            { name: 'Transportation Equipment', weight: 0.00041299999999999996 }
          ],
          url: 'https://www.vanguard.com',
          valueInBaseCurrency: null,
          valueInPercentage: 0.145162408515095
        },
        'XDWD.DE': {
          currency: 'EUR',
          markets: {
            UNKNOWN: 0,
            developedMarkets: 0.9688723314999987,
            emergingMarkets: 0,
            otherMarkets: 0
          },
          marketsAdvanced: {
            UNKNOWN: 0,
            asiaPacific: 0.0288497227,
            emergingMarkets: 0,
            europe: 0.1665952994,
            japan: 0.060962362,
            northAmerica: 0.7124649473999988,
            otherMarkets: 0
          },
          marketPrice: 105.72,
          symbol: 'XDWD.DE',
          tags: [],
          transactionCount: 1,
          allocationInPercentage: 0.03598477442100562,
          assetClass: 'EQUITY',
          assetSubClass: 'ETF',
          countries: [
            {
              code: 'US',
              weight: 0.6842147911999988,
              continent: 'North America',
              name: 'United States'
            },
            {
              code: 'SG',
              weight: 0.0035432595,
              continent: 'Asia',
              name: 'Singapore'
            },
            {
              code: 'NZ',
              weight: 0.0006406316,
              continent: 'Oceania',
              name: 'New Zealand'
            },
            {
              code: 'NL',
              weight: 0.0120495328,
              continent: 'Europe',
              name: 'Netherlands'
            },
            {
              code: 'JP',
              weight: 0.060962362,
              continent: 'Asia',
              name: 'Japan'
            },
            {
              code: 'IT',
              weight: 0.007030094800000001,
              continent: 'Europe',
              name: 'Italy'
            },
            {
              code: 'FR',
              weight: 0.0320340333,
              continent: 'Europe',
              name: 'France'
            },
            {
              code: 'ES',
              weight: 0.006727091600000001,
              continent: 'Europe',
              name: 'Spain'
            },
            {
              code: 'CA',
              weight: 0.0282501562,
              continent: 'North America',
              name: 'Canada'
            },
            {
              code: 'BE',
              weight: 0.0026160271,
              continent: 'Europe',
              name: 'Belgium'
            },
            {
              code: 'AU',
              weight: 0.0183846018,
              continent: 'Oceania',
              name: 'Australia'
            },
            {
              code: 'AT',
              weight: 0.0004905628,
              continent: 'Europe',
              name: 'Austria'
            },
            {
              code: 'GB',
              weight: 0.03339169199999999,
              continent: 'Europe',
              name: 'United Kingdom'
            },
            {
              code: 'DE',
              weight: 0.0221912394,
              continent: 'Europe',
              name: 'Germany'
            },
            {
              code: 'SE',
              weight: 0.006880960399999999,
              continent: 'Europe',
              name: 'Sweden'
            },
            {
              code: 'CH',
              weight: 0.0262900458,
              continent: 'Europe',
              name: 'Switzerland'
            },
            {
              code: 'IL',
              weight: 0.001658592,
              continent: 'Asia',
              name: 'Israel'
            },
            {
              code: 'HK',
              weight: 0.0062812298,
              continent: 'Asia',
              name: 'Hong Kong'
            },
            {
              code: 'FI',
              weight: 0.0023597206,
              continent: 'Europe',
              name: 'Finland'
            },
            {
              code: 'DK',
              weight: 0.0087064137,
              continent: 'Europe',
              name: 'Denmark'
            },
            {
              code: 'NO',
              weight: 0.0014517355,
              continent: 'Europe',
              name: 'Norway'
            },
            {
              code: 'PT',
              weight: 0.0004820743,
              continent: 'Europe',
              name: 'Portugal'
            },
            {
              code: 'IE',
              weight: 0.0022354833,
              continent: 'Europe',
              name: 'Ireland'
            }
          ],
          dataSource: 'YAHOO',
          dateOfFirstActivity: '2021-08-18T22:00:00.000Z',
          dividend: 0,
          grossPerformance: null,
          grossPerformancePercent: 0.3474381850624522,
          grossPerformancePercentWithCurrencyEffect: 0.28744846894552306,
          grossPerformanceWithCurrencyEffect: null,
          holdings: [
            {
              allocationInPercentage: 0.051778373,
              name: 'APPLE INC',
              valueInBaseCurrency: null
            },
            {
              allocationInPercentage: 0.0403267055,
              name: 'MICROSOFT CORP',
              valueInBaseCurrency: null
            },
            {
              allocationInPercentage: 0.0221895862,
              name: 'AMAZON COM INC',
              valueInBaseCurrency: null
            },
            {
              allocationInPercentage: 0.0208100035,
              name: 'NVIDIA CORP',
              valueInBaseCurrency: null
            },
            {
              allocationInPercentage: 0.0139820061,
              name: 'ALPHABET INC CLASS A',
              valueInBaseCurrency: null
            },
            {
              allocationInPercentage: 0.0126263246,
              name: 'ALPHABET INC CLASS C',
              valueInBaseCurrency: null
            },
            {
              allocationInPercentage: 0.0121596126,
              name: 'TESLA INC',
              valueInBaseCurrency: null
            },
            {
              allocationInPercentage: 0.0114079282,
              name: 'FACEBOOK CLASS A  INC',
              valueInBaseCurrency: null
            },
            {
              allocationInPercentage: 0.0081570352,
              name: 'BERKSHIRE HATHAWAY INC CLASS B',
              valueInBaseCurrency: null
            },
            {
              allocationInPercentage: 0.0079471416,
              name: 'EXXON MOBIL CORP',
              valueInBaseCurrency: null
            },
            {
              allocationInPercentage: 0.0078190388,
              name: 'ELI LILLY',
              valueInBaseCurrency: null
            },
            {
              allocationInPercentage: 0.0077121293,
              name: 'UNITEDHEALTH GROUP INC',
              valueInBaseCurrency: null
            },
            {
              allocationInPercentage: 0.0074484861,
              name: 'JPMORGAN CHASE & CO',
              valueInBaseCurrency: null
            },
            {
              allocationInPercentage: 0.006978079,
              name: 'VISA INC CLASS A',
              valueInBaseCurrency: null
            }
          ],
          investment: null,
          name: 'Xtrackers MSCI World UCITS ETF 1C',
          netPerformance: null,
          netPerformancePercent: 0.3423570396805166,
          netPerformancePercentWithCurrencyEffect: 0.28236732356358746,
          netPerformanceWithCurrencyEffect: null,
          quantity: null,
          sectors: [
            { name: 'Real Estate', weight: 0.0227030317 },
            { name: 'Telecommunications', weight: 0.0121560434 },
            { name: 'Consumer Cyclical', weight: 0.11961483 },
            { name: 'Technology', weight: 0.2874777003999999 },
            { name: 'Financials', weight: 0.1235808743 },
            { name: 'Healthcare', weight: 0.1235932822 },
            { name: 'Consumer Staples', weight: 0.0678151631 },
            { name: 'Industrials', weight: 0.100454506 },
            { name: 'Materials', weight: 0.03695810040000001 },
            { name: 'Energy', weight: 0.0446714376 },
            { name: 'Utilities', weight: 0.02511086069999999 },
            { name: 'Communication', weight: 0.0019910151 },
            { name: 'Chemicals', weight: 0.0002828541 },
            { name: 'Information & Communication', weight: 0.0007891258 },
            { name: 'Banks', weight: 0.0002609199 },
            { name: 'Land Transportation', weight: 0.0001578684 },
            { name: 'Electric Appliances', weight: 0.0005693792 },
            { name: 'Transportation Equipment', weight: 0.000423318 },
            { name: 'Metal Products', weight: 0.0000542923 },
            { name: 'Real Estate ex REIT', weight: 0.0000483797 },
            { name: 'Wholesale Trade', weight: 0.0000686654 },
            { name: 'Other Financing Business', weight: 0.0000906838 }
          ],
          url: null,
          valueInBaseCurrency: null,
          valueInPercentage: 0.055647656152211074
        },
        USD: {
          currency: 'USD',
          allocationInPercentage: 0.20291717628620132,
          assetClass: 'LIQUIDITY',
          assetSubClass: 'CASH',
          countries: [],
          dividend: 0,
          grossPerformance: null,
          grossPerformancePercent: 0,
          grossPerformancePercentWithCurrencyEffect: 0,
          grossPerformanceWithCurrencyEffect: null,
          holdings: [],
          investment: null,
          marketPrice: 0,
          name: 'USD',
          netPerformance: null,
          netPerformancePercent: 0,
          netPerformancePercentWithCurrencyEffect: 0,
          netPerformanceWithCurrencyEffect: null,
          quantity: null,
          sectors: [],
          symbol: 'USD',
          tags: [],
          transactionCount: 0,
          valueInBaseCurrency: null,
          valueInPercentage: 0.3137956381563603
        }
      },
      platforms: {
        'a5b14588-49a0-48e4-b9f7-e186b27860b7': {
          balance: null,
          currency: 'EUR',
          name: 'Bondora',
          valueInBaseCurrency: null,
          valueInPercentage: 0.014036487867880205
        },
        '8dc24b88-bb92-4152-af25-fe6a31643e26': {
          balance: null,
          currency: 'USD',
          name: 'Coinbase',
          valueInBaseCurrency: null,
          valueInPercentage: 0.23507962349569783
        },
        '94c1a2f4-a666-47be-84cd-4c8952e74c81': {
          balance: null,
          currency: 'EUR',
          name: 'DEGIRO',
          valueInBaseCurrency: null,
          valueInPercentage: 0.5689266688833119
        },
        '9da3a8a7-4795-43e3-a6db-ccb914189737': {
          balance: null,
          currency: 'USD',
          name: 'Interactive Brokers',
          valueInBaseCurrency: null,
          valueInPercentage: 0.27637791413567103
        },
        'cbbb4642-1f1e-412d-91a7-27ed695a048d': {
          balance: null,
          currency: 'CHF',
          name: 'frankly',
          valueInBaseCurrency: null,
          valueInPercentage: 0.14065892911313693
        },
        '43e8fcd1-5b79-4100-b678-d2229bd1660d': {
          balance: null,
          currency: 'USD',
          name: 'J.P. Morgan',
          valueInBaseCurrency: null,
          valueInPercentage: 0.2987631351458632
        },
        '747b9016-8ba1-4d13-8255-aec49a468ead': {
          balance: null,
          currency: 'USD',
          name: 'Revolut',
          valueInBaseCurrency: null,
          valueInPercentage: 0.01257950042719424
        }
      },
      summary: {
        annualizedPerformancePercent: 0.16690880197786,
        annualizedPerformancePercentWithCurrencyEffect: 0.1694019484552876,
        cash: null,
        excludedAccountsAndActivities: null,
        netPerformance: null,
        netPerformancePercentage: 2.3039314216696174,
        netPerformancePercentageWithCurrencyEffect: 2.3589806001456606,
        netPerformanceWithCurrencyEffect: null,
        totalBuy: null,
        totalSell: null,
        committedFunds: null,
        currentValueInBaseCurrency: null,
        dividendInBaseCurrency: null,
        emergencyFund: null,
        fees: null,
        filteredValueInBaseCurrency: null,
        filteredValueInPercentage: 0.9646870292294938,
        fireWealth: null,
        grossPerformance: null,
        grossPerformanceWithCurrencyEffect: null,
        interest: null,
        items: null,
        liabilities: null,
        ordersCount: 29,
        totalInvestment: null,
        totalValueInBaseCurrency: null,
        currentNetWorth: null
      }
    });
    console.timeEnd('redactAttributes execution time');
  });
});
