import { Rule } from '@ghostfolio/api/models/rule';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { UserSettings } from '@ghostfolio/common/interfaces';

import { Settings } from './interfaces/rule-settings.interface';

export class RegionalMarketClusterRiskJapan extends Rule<Settings> {
  private currentValueInBaseCurrency: number;
  private japanValueInBaseCurrency: number;

  public constructor(
    protected exchangeRateDataService: ExchangeRateDataService,
    currentValueInBaseCurrency: number,
    japanValueInBaseCurrency: number
  ) {
    super(exchangeRateDataService, {
      key: RegionalMarketClusterRiskJapan.name
    });

    this.currentValueInBaseCurrency = currentValueInBaseCurrency;
    this.japanValueInBaseCurrency = japanValueInBaseCurrency;
  }

  public evaluate(ruleSettings: Settings) {
    const japanMarketValueRatio = this.currentValueInBaseCurrency
      ? this.japanValueInBaseCurrency / this.currentValueInBaseCurrency
      : 0;

    if (japanMarketValueRatio > ruleSettings.thresholdMax) {
      return {
        evaluation: `The Japan market contribution of your current investment (${(japanMarketValueRatio * 100).toPrecision(3)}%) exceeds ${(
          ruleSettings.thresholdMax * 100
        ).toPrecision(3)}%`,
        value: false
      };
    } else if (japanMarketValueRatio < ruleSettings.thresholdMin) {
      return {
        evaluation: `The Japan market contribution of your current investment (${(japanMarketValueRatio * 100).toPrecision(3)}%) is below ${(
          ruleSettings.thresholdMin * 100
        ).toPrecision(3)}%`,
        value: false
      };
    }

    return {
      evaluation: `The Japan market contribution of your current investment (${(japanMarketValueRatio * 100).toPrecision(3)}%) is within the range of ${(
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
    return 'Japan';
  }

  public getCategoryName() {
    return 'Regional Market Cluster Risk';
  }

  public getSettings({ baseCurrency, xRayRules }: UserSettings): Settings {
    return {
      baseCurrency,
      isActive: xRayRules?.[this.getKey()]?.isActive ?? true,
      thresholdMax: xRayRules?.[this.getKey()]?.thresholdMax ?? 0.06,
      thresholdMin: xRayRules?.[this.getKey()]?.thresholdMin ?? 0.04
    };
  }
}
