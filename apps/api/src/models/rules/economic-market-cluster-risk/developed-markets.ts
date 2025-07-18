import { RuleSettings } from '@ghostfolio/api/models/interfaces/rule-settings.interface';
import { Rule } from '@ghostfolio/api/models/rule';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { I18nService } from '@ghostfolio/api/services/i18n/i18n.service';
import { UserSettings } from '@ghostfolio/common/interfaces';

export class EconomicMarketClusterRiskDevelopedMarkets extends Rule<Settings> {
  private currentValueInBaseCurrency: number;
  private developedMarketsValueInBaseCurrency: number;

  public constructor(
    protected exchangeRateDataService: ExchangeRateDataService,
    private i18nService: I18nService,
    currentValueInBaseCurrency: number,
    developedMarketsValueInBaseCurrency: number,
    languageCode: string
  ) {
    super(exchangeRateDataService, {
      languageCode,
      key: EconomicMarketClusterRiskDevelopedMarkets.name
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
        evaluation: this.i18nService.getTranslation({
          id: 'rule.economicMarketClusterRiskDevelopedMarkets.false.max',
          languageCode: this.getLanguageCode(),
          placeholders: {
            developedMarketsValueRatio: (
              developedMarketsValueRatio * 100
            ).toPrecision(3),
            thresholdMax: (ruleSettings.thresholdMax * 100).toPrecision(3)
          }
        }),
        value: false
      };
    } else if (developedMarketsValueRatio < ruleSettings.thresholdMin) {
      return {
        evaluation: this.i18nService.getTranslation({
          id: 'rule.economicMarketClusterRiskDevelopedMarkets.false.min',
          languageCode: this.getLanguageCode(),
          placeholders: {
            developedMarketsValueRatio: (
              developedMarketsValueRatio * 100
            ).toPrecision(3),
            thresholdMin: (ruleSettings.thresholdMin * 100).toPrecision(3)
          }
        }),
        value: false
      };
    }

    return {
      evaluation: this.i18nService.getTranslation({
        id: 'rule.economicMarketClusterRiskDevelopedMarkets.true',
        languageCode: this.getLanguageCode(),
        placeholders: {
          developedMarketsValueRatio: (
            developedMarketsValueRatio * 100
          ).toPrecision(3),
          thresholdMin: (ruleSettings.thresholdMin * 100).toPrecision(3),
          thresholdMax: (ruleSettings.thresholdMax * 100).toPrecision(3)
        }
      }),
      value: true
    };
  }

  public getCategoryName() {
    return this.i18nService.getTranslation({
      id: 'rule.economicMarketClusterRisk.category',
      languageCode: this.getLanguageCode()
    });
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
    return this.i18nService.getTranslation({
      id: 'rule.economicMarketClusterRiskDevelopedMarkets',
      languageCode: this.getLanguageCode()
    });
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
