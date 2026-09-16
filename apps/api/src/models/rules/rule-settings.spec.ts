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
    expect(Object.keys(getXRayRulesSettings({}))).toHaveLength(17);
  });
});
