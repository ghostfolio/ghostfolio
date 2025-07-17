import { RuleSettings } from '@ghostfolio/api/models/interfaces/rule-settings.interface';
import { Rule } from '@ghostfolio/api/models/rule';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { I18nService } from '@ghostfolio/api/services/i18n/i18n.service';
import { UserSettings } from '@ghostfolio/common/interfaces';

export class EconomicMarketClusterRiskEmergingMarkets extends Rule<Settings> {
  private currentValueInBaseCurrency: number;
  private emergingMarketsValueInBaseCurrency: number;

  public constructor(
    protected exchangeRateDataService: ExchangeRateDataService,
    private i18nService: I18nService,
    currentValueInBaseCurrency: number,
    emergingMarketsValueInBaseCurrency: number,
    languageCode: string
  ) {
    super(exchangeRateDataService, {
      languageCode,
      key: EconomicMarketClusterRiskEmergingMarkets.name
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
        evaluation: this.i18nService.getTranslation({
          id: 'rule.economicMarketClusterRiskEmergingMarkets.false.max',
          languageCode: this.getLanguageCode(),
          placeholders: {
            emergingMarketsValueRatio: (
              emergingMarketsValueRatio * 100
            ).toPrecision(3),
            thresholdMax: (ruleSettings.thresholdMax * 100).toPrecision(3)
          }
        }),
        value: false
      };
    } else if (emergingMarketsValueRatio < ruleSettings.thresholdMin) {
      return {
        evaluation: this.i18nService.getTranslation({
          id: 'rule.economicMarketClusterRiskEmergingMarkets.false.min',
          languageCode: this.getLanguageCode(),
          placeholders: {
            emergingMarketsValueRatio: (
              emergingMarketsValueRatio * 100
            ).toPrecision(3),
            thresholdMin: (ruleSettings.thresholdMin * 100).toPrecision(3)
          }
        }),
        value: false
      };
    }

    return {
      evaluation: this.i18nService.getTranslation({
        id: 'rule.economicMarketClusterRiskEmergingMarkets.true',
        languageCode: this.getLanguageCode(),
        placeholders: {
          emergingMarketsValueRatio: (
            emergingMarketsValueRatio * 100
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
      id: 'rule.economicMarketClusterRiskEmergingMarkets',
      languageCode: this.getLanguageCode()
    });
  }

  public getSettings({ baseCurrency, xRayRules }: UserSettings): Settings {
    return {
      baseCurrency,
      isActive: xRayRules?.[this.getKey()]?.isActive ?? true,
      thresholdMax: xRayRules?.[this.getKey()]?.thresholdMax ?? 0.32,
      thresholdMin: xRayRules?.[this.getKey()]?.thresholdMin ?? 0.28
    };
  }
}

interface Settings extends RuleSettings {
  baseCurrency: string;
  thresholdMin: number;
  thresholdMax: number;
}
