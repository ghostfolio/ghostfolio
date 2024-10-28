import { RuleSettings } from '@ghostfolio/api/models/interfaces/rule-settings.interface';
import { Rule } from '@ghostfolio/api/models/rule';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { UserSettings } from '@ghostfolio/common/interfaces';

export class EconomicMarketClusterRiskDevelopedMarkets extends Rule<Settings> {
  private currentValueInBaseCurrency: number;
  private developedMarketsValueInBaseCurrency: number;

  public constructor(
    protected exchangeRateDataService: ExchangeRateDataService,
    currentValueInBaseCurrency: number,
    developedMarketsValueInBaseCurrency: number
  ) {
    super(exchangeRateDataService, {
      key: EconomicMarketClusterRiskDevelopedMarkets.name,
      name: 'Developed Markets'
    });

    this.currentValueInBaseCurrency = currentValueInBaseCurrency;
    this.developedMarketsValueInBaseCurrency =
      developedMarketsValueInBaseCurrency;
  }

  public evaluate(ruleSettings: Settings) {
    const developedMarketsValueRatio = this.currentValueInBaseCurrency
      ? this.developedMarketsValueInBaseCurrency /
        this.currentValueInBaseCurrency
      : 0;

    if (developedMarketsValueRatio > ruleSettings.thresholdMax) {
      return {
        evaluation: `The developed markets contribution of your current investment (${(developedMarketsValueRatio * 100).toPrecision(3)}%) exceeds ${(
          ruleSettings.thresholdMax * 100
        ).toPrecision(3)}%`,
        value: false
      };
    } else if (developedMarketsValueRatio < ruleSettings.thresholdMin) {
      return {
        evaluation: `The developed markets contribution of your current investment (${(developedMarketsValueRatio * 100).toPrecision(3)}%) is below ${(
          ruleSettings.thresholdMin * 100
        ).toPrecision(3)}%`,
        value: false
      };
    }

    return {
      evaluation: `The developed markets contribution of your current investment (${(developedMarketsValueRatio * 100).toPrecision(3)}%) is within the range of ${(
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
      thresholdMax: xRayRules?.[this.getKey()]?.thresholdMax ?? 0.72,
      thresholdMin: xRayRules?.[this.getKey()]?.thresholdMin ?? 0.68
    };
  }
}

interface Settings extends RuleSettings {
  baseCurrency: string;
  thresholdMin: number;
  thresholdMax: number;
}
