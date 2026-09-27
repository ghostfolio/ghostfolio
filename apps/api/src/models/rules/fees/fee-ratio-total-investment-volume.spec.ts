import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { I18nService } from '@ghostfolio/api/services/i18n/i18n.service';

import { FeeRatioTotalInvestmentVolume } from './fee-ratio-total-investment-volume';

describe('FeeRatioTotalInvestmentVolume', () => {
  let getTranslation: jest.Mock;
  let i18nService: I18nService;

  beforeEach(() => {
    getTranslation = jest.fn().mockReturnValue('');
    i18nService = { getTranslation } as unknown as I18nService;
  });

  function evaluate({
    fees,
    thresholdMax,
    totalInvestmentVolumeInBaseCurrency
  }: {
    fees: number;
    thresholdMax: number;
    totalInvestmentVolumeInBaseCurrency: number;
  }) {
    const rule = new FeeRatioTotalInvestmentVolume({
      fees,
      i18nService,
      totalInvestmentVolumeInBaseCurrency,
      exchangeRateDataService: null as unknown as ExchangeRateDataService,
      languageCode: 'en'
    });

    const { value } = rule.evaluate({
      thresholdMax,
      baseCurrency: 'USD',
      isActive: true,
      locale: 'en-US'
    });

    return {
      placeholders: getTranslation.mock.calls[0][0].placeholders,
      value
    };
  }

  it('reports the fee ratio and the threshold when the threshold is exceeded', () => {
    // The fees are 10% of the investment volume, against a 1% threshold.
    const { placeholders, value } = evaluate({
      fees: 100,
      thresholdMax: 0.01,
      totalInvestmentVolumeInBaseCurrency: 1000
    });

    expect(value).toBe(false);
    expect(placeholders).toEqual({ feeRatio: '10.0', thresholdMax: '1.00' });
  });

  it('reports the fee ratio and the threshold when the threshold is not exceeded', () => {
    // The fees are 1% of the investment volume, against a 10% threshold.
    const { placeholders, value } = evaluate({
      fees: 10,
      thresholdMax: 0.1,
      totalInvestmentVolumeInBaseCurrency: 1000
    });

    expect(value).toBe(true);
    expect(placeholders).toEqual({ feeRatio: '1.00', thresholdMax: '10.00' });
  });
});
