import { RuleSettings } from '@ghostfolio/api/models/interfaces/rule-settings.interface';
import { Rule } from '@ghostfolio/api/models/rule';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { UserSettings } from '@ghostfolio/common/interfaces';

export class RegionalMarketClusterRiskNorthAmerica extends Rule<Settings> {
  private currentValueInBaseCurrency: number;
  private northAmericaValueInBaseCurrency: number;

  public constructor(
    protected exchangeRateDataService: ExchangeRateDataService,
    currentValueInBaseCurrency: number,
    valueInBaseCurrency
  ) {
    super(exchangeRateDataService, {
      key: RegionalMarketClusterRiskNorthAmerica.name,
      name: 'North America'
    });

    this.currentValueInBaseCurrency = currentValueInBaseCurrency;
    this.northAmericaValueInBaseCurrency = valueInBaseCurrency;
  }

  public evaluate(ruleSettings: Settings) {
    const northAmericaMarketValueRatio = this.currentValueInBaseCurrency
      ? this.northAmericaValueInBaseCurrency / this.currentValueInBaseCurrency
      : 0;

    if (northAmericaMarketValueRatio > ruleSettings.thresholdMax) {
      return {
        evaluation: `The North America market contribution of your current investment (${(northAmericaMarketValueRatio * 100).toPrecision(3)}%) exceeds ${(
          ruleSettings.thresholdMax * 100
        ).toPrecision(3)}%`,
        value: false
      };
    } else if (northAmericaMarketValueRatio < ruleSettings.thresholdMin) {
      return {
        evaluation: `The North America market contribution of your current investment (${(northAmericaMarketValueRatio * 100).toPrecision(3)}%) is below ${(
          ruleSettings.thresholdMin * 100
        ).toPrecision(3)}%`,
        value: false
      };
    }

    return {
      evaluation: `The North America market contribution of your current investment (${(northAmericaMarketValueRatio * 100).toPrecision(3)}%) is within the range of ${(
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
      thresholdMax: xRayRules?.[this.getKey()]?.thresholdMax ?? 0.69,
      thresholdMin: xRayRules?.[this.getKey()]?.thresholdMin ?? 0.65
    };
  }
}

interface Settings extends RuleSettings {
  baseCurrency: string;
  thresholdMin: number;
  thresholdMax: number;
}
