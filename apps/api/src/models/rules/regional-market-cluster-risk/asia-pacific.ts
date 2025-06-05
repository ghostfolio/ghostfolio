import { Rule } from '@ghostfolio/api/models/rule';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { UserSettings } from '@ghostfolio/common/interfaces';

import { Settings } from './interfaces/rule-settings.interface';

export class RegionalMarketClusterRiskAsiaPacific extends Rule<Settings> {
  private asiaPacificValueInBaseCurrency: number;
  private currentValueInBaseCurrency: number;

  public constructor(
    protected exchangeRateDataService: ExchangeRateDataService,
    currentValueInBaseCurrency: number,
    asiaPacificValueInBaseCurrency: number
  ) {
    super(exchangeRateDataService, {
      key: RegionalMarketClusterRiskAsiaPacific.name
    });

    this.asiaPacificValueInBaseCurrency = asiaPacificValueInBaseCurrency;
    this.currentValueInBaseCurrency = currentValueInBaseCurrency;
  }

  public evaluate(ruleSettings: Settings) {
    const asiaPacificMarketValueRatio = this.currentValueInBaseCurrency
      ? this.asiaPacificValueInBaseCurrency / this.currentValueInBaseCurrency
      : 0;

    if (asiaPacificMarketValueRatio > ruleSettings.thresholdMax) {
      return {
        evaluation: `The Asia-Pacific market contribution of your current investment (${(asiaPacificMarketValueRatio * 100).toPrecision(3)}%) exceeds ${(
          ruleSettings.thresholdMax * 100
        ).toPrecision(3)}%`,
        value: false
      };
    } else if (asiaPacificMarketValueRatio < ruleSettings.thresholdMin) {
      return {
        evaluation: `The Asia-Pacific market contribution of your current investment (${(asiaPacificMarketValueRatio * 100).toPrecision(3)}%) is below ${(
          ruleSettings.thresholdMin * 100
        ).toPrecision(3)}%`,
        value: false
      };
    }

    return {
      evaluation: `The Asia-Pacific market contribution of your current investment (${(asiaPacificMarketValueRatio * 100).toPrecision(3)}%) is within the range of ${(
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

  public getName() {
    return 'Asia-Pacific';
  }

  public getSettings({ baseCurrency, xRayRules }: UserSettings): Settings {
    return {
      baseCurrency,
      isActive: xRayRules?.[this.getKey()]?.isActive ?? true,
      thresholdMax: xRayRules?.[this.getKey()]?.thresholdMax ?? 0.03,
      thresholdMin: xRayRules?.[this.getKey()]?.thresholdMin ?? 0.02
    };
  }
}
