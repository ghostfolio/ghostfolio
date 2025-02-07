import { Rule } from '@ghostfolio/api/models/rule';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { UserSettings } from '@ghostfolio/common/interfaces';

import { Settings } from './interfaces/rule-settings.interface';

export class RegionalMarketClusterRiskEmergingMarkets extends Rule<Settings> {
  private currentValueInBaseCurrency: number;
  private emergingMarketsValueInBaseCurrency: number;

  public constructor(
    protected exchangeRateDataService: ExchangeRateDataService,
    currentValueInBaseCurrency: number,
    emergingMarketsValueInBaseCurrency: number
  ) {
    super(exchangeRateDataService, {
      key: RegionalMarketClusterRiskEmergingMarkets.name,
      name: 'Emerging Markets'
    });

    this.currentValueInBaseCurrency = currentValueInBaseCurrency;
    this.emergingMarketsValueInBaseCurrency =
      emergingMarketsValueInBaseCurrency;
  }

  public evaluate(ruleSettings: Settings) {
    const emergingMarketsValueRatio = this.currentValueInBaseCurrency
      ? this.emergingMarketsValueInBaseCurrency /
        this.currentValueInBaseCurrency
      : 0;

    if (emergingMarketsValueRatio > ruleSettings.thresholdMax) {
      return {
        evaluation: `The Emerging Markets contribution of your current investment (${(emergingMarketsValueRatio * 100).toPrecision(3)}%) exceeds ${(
          ruleSettings.thresholdMax * 100
        ).toPrecision(3)}%`,
        value: false
      };
    } else if (emergingMarketsValueRatio < ruleSettings.thresholdMin) {
      return {
        evaluation: `The Emerging Markets contribution of your current investment (${(emergingMarketsValueRatio * 100).toPrecision(3)}%) is below ${(
          ruleSettings.thresholdMin * 100
        ).toPrecision(3)}%`,
        value: false
      };
    }

    return {
      evaluation: `The Emerging Markets contribution of your current investment (${(emergingMarketsValueRatio * 100).toPrecision(3)}%) is within the range of ${(
        ruleSettings.thresholdMin * 100
      ).toPrecision(
        3
      )}% and ${(ruleSettings.thresholdMax * 100).toPrecision(3)}%`,
      value: true
    };
  }

  public getConfiguration() {
    return {
      threshold: {
        max: 1,
        min: 0,
        step: 0.01,
        unit: '%'
      },
      thresholdMax: true,
      thresholdMin: true
    };
  }

  public getSettings({ baseCurrency, xRayRules }: UserSettings): Settings {
    return {
      baseCurrency,
      isActive: xRayRules?.[this.getKey()]?.isActive ?? true,
      thresholdMax: xRayRules?.[this.getKey()]?.thresholdMax ?? 0.12,
      thresholdMin: xRayRules?.[this.getKey()]?.thresholdMin ?? 0.08
    };
  }
}
