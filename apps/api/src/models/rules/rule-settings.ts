import { RuleSettingsConfiguration } from '@ghostfolio/api/models/interfaces/rule-settings-configuration.interface';
import { XRayRuleKey } from '@ghostfolio/api/models/types/x-ray-rule-key.type';
import { DEFAULT_CURRENCY, DEFAULT_LOCALE } from '@ghostfolio/common/config';
import {
  RuleSettings,
  UserSettings,
  XRayRulesSettings
} from '@ghostfolio/common/interfaces';

const RULE_SETTINGS_CONFIGURATIONS = {
  AccountClusterRiskCurrentInvestment: { thresholdMax: 0.5 },
  AccountClusterRiskSingleAccount: { withBaseCurrency: false },
  AssetClassClusterRiskEquity: {
    thresholdMax: 0.82,
    thresholdMin: 0.78
  },
  AssetClassClusterRiskFixedIncome: {
    thresholdMax: 0.22,
    thresholdMin: 0.18
  },
  BuyingPower: { thresholdMin: 0 },
  CurrencyClusterRiskBaseCurrencyCurrentInvestment: {},
  CurrencyClusterRiskCurrentInvestment: { thresholdMax: 0.5 },
  EconomicMarketClusterRiskDevelopedMarkets: {
    thresholdMax: 0.72,
    thresholdMin: 0.68
  },
  EconomicMarketClusterRiskEmergingMarkets: {
    thresholdMax: 0.32,
    thresholdMin: 0.28
  },
  EmergencyFundCoverage: {},
  EmergencyFundSetup: {},
  FeeRatioTotalInvestmentVolume: { thresholdMax: 0.01 },
  RegionalMarketClusterRiskAsiaPacific: {
    thresholdMax: 0.03,
    thresholdMin: 0.02
  },
  RegionalMarketClusterRiskEmergingMarkets: {
    thresholdMax: 0.12,
    thresholdMin: 0.08
  },
  RegionalMarketClusterRiskEurope: {
    thresholdMax: 0.15,
    thresholdMin: 0.11
  },
  RegionalMarketClusterRiskJapan: {
    thresholdMax: 0.06,
    thresholdMin: 0.04
  },
  RegionalMarketClusterRiskNorthAmerica: {
    thresholdMax: 0.69,
    thresholdMin: 0.65
  }
} as const satisfies Record<XRayRuleKey, RuleSettingsConfiguration>;

export function getRuleSettings<T extends RuleSettings>({
  key,
  userSettings
}: {
  key: XRayRuleKey;
  userSettings: UserSettings;
}): T {
  const configuration: RuleSettingsConfiguration =
    RULE_SETTINGS_CONFIGURATIONS[key];
  const configuredSettings = userSettings.xRayRules?.[key];
  const settings: RuleSettings & {
    baseCurrency?: string;
    thresholdMax?: number;
    thresholdMin?: number;
  } = {
    isActive: configuredSettings?.isActive ?? true,
    locale: userSettings.locale ?? DEFAULT_LOCALE
  };

  if (configuration.withBaseCurrency !== false) {
    settings.baseCurrency = userSettings.baseCurrency ?? DEFAULT_CURRENCY;
  }

  if (configuration.thresholdMax !== undefined) {
    settings.thresholdMax =
      configuredSettings?.thresholdMax ?? configuration.thresholdMax;
  }

  if (configuration.thresholdMin !== undefined) {
    settings.thresholdMin =
      configuredSettings?.thresholdMin ?? configuration.thresholdMin;
  }

  return settings as T;
}

export function getXRayRulesSettings(
  userSettings: UserSettings
): XRayRulesSettings {
  return Object.fromEntries(
    (Object.keys(RULE_SETTINGS_CONFIGURATIONS) as XRayRuleKey[]).map((key) => [
      key,
      getRuleSettings({ key, userSettings })
    ])
  ) as XRayRulesSettings;
}
