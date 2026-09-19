import { getRuleSettings, getXRayRulesSettings } from './rule-settings';

describe('Rule settings', () => {
  it('gets default settings for a rule', () => {
    expect(
      getRuleSettings({
        key: 'AssetClassClusterRiskEquity',
        userSettings: {}
      })
    ).toEqual({
      baseCurrency: 'USD',
      isActive: true,
      locale: 'en-US',
      thresholdMax: 0.82,
      thresholdMin: 0.78
    });
  });

  it('gets a default threshold of zero for a rule', () => {
    expect(
      getRuleSettings({
        key: 'BuyingPower',
        userSettings: {}
      })
    ).toEqual({
      baseCurrency: 'USD',
      isActive: true,
      locale: 'en-US',
      thresholdMin: 0
    });
  });

  it('applies the configured settings for a rule', () => {
    expect(
      getRuleSettings({
        key: 'AssetClassClusterRiskEquity',
        userSettings: {
          baseCurrency: 'CHF',
          locale: 'de-CH',
          xRayRules: {
            AssetClassClusterRiskEquity: {
              isActive: false,
              thresholdMax: 0.9,
              thresholdMin: 0.7
            }
          }
        }
      })
    ).toEqual({
      baseCurrency: 'CHF',
      isActive: false,
      locale: 'de-CH',
      thresholdMax: 0.9,
      thresholdMin: 0.7
    });
  });

  it('applies the default for a threshold which is not configured', () => {
    expect(
      getRuleSettings({
        key: 'AssetClassClusterRiskEquity',
        userSettings: {
          xRayRules: {
            AssetClassClusterRiskEquity: { isActive: true, thresholdMax: 0.9 }
          }
        }
      })
    ).toEqual({
      baseCurrency: 'USD',
      isActive: true,
      locale: 'en-US',
      thresholdMax: 0.9,
      thresholdMin: 0.78
    });
  });

  it('applies a configured threshold of zero', () => {
    expect(
      getRuleSettings({
        key: 'AssetClassClusterRiskEquity',
        userSettings: {
          xRayRules: {
            AssetClassClusterRiskEquity: { isActive: true, thresholdMin: 0 }
          }
        }
      })
    ).toEqual({
      baseCurrency: 'USD',
      isActive: true,
      locale: 'en-US',
      thresholdMax: 0.82,
      thresholdMin: 0
    });
  });

  it('omits the base currency when it is not used by a rule', () => {
    expect(
      getRuleSettings({
        key: 'AccountClusterRiskSingleAccount',
        userSettings: {}
      })
    ).toEqual({
      isActive: true,
      locale: 'en-US'
    });
  });

  it('gets settings for all rules', () => {
    expect(Object.keys(getXRayRulesSettings({})).sort()).toEqual([
      'AccountClusterRiskCurrentInvestment',
      'AccountClusterRiskSingleAccount',
      'AssetClassClusterRiskEquity',
      'AssetClassClusterRiskFixedIncome',
      'BuyingPower',
      'CurrencyClusterRiskBaseCurrencyCurrentInvestment',
      'CurrencyClusterRiskCurrentInvestment',
      'EconomicMarketClusterRiskDevelopedMarkets',
      'EconomicMarketClusterRiskEmergingMarkets',
      'EmergencyFundCoverage',
      'EmergencyFundSetup',
      'FeeRatioTotalInvestmentVolume',
      'RegionalMarketClusterRiskAsiaPacific',
      'RegionalMarketClusterRiskEmergingMarkets',
      'RegionalMarketClusterRiskEurope',
      'RegionalMarketClusterRiskJapan',
      'RegionalMarketClusterRiskNorthAmerica'
    ]);
  });
});
