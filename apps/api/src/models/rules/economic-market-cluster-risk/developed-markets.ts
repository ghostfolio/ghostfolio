import { Rule } from '@ghostfolio/api/models/rule';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { I18nService } from '@ghostfolio/api/services/i18n/i18n.service';
import { RuleSettings } from '@ghostfolio/common/interfaces';

export class EconomicMarketClusterRiskDevelopedMarkets extends Rule<Settings> {
  private currentValueInBaseCurrency: number;
  private developedMarketsValueInBaseCurrency: number;
  private i18nService: I18nService;

  public constructor({
    currentValueInBaseCurrency,
    developedMarketsValueInBaseCurrency,
    exchangeRateDataService,
    i18nService,
    languageCode
  }: {
    currentValueInBaseCurrency: number;
    developedMarketsValueInBaseCurrency: number;
    exchangeRateDataService: ExchangeRateDataService;
    i18nService: I18nService;
    languageCode: string;
  }) {
    super(exchangeRateDataService, {
      languageCode,
      key: 'EconomicMarketClusterRiskDevelopedMarkets'
    });

    this.currentValueInBaseCurrency = currentValueInBaseCurrency;
    this.developedMarketsValueInBaseCurrency =
      developedMarketsValueInBaseCurrency;
    this.i18nService = i18nService;
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
}

interface Settings extends RuleSettings {
  baseCurrency: string;
  thresholdMin: number;
  thresholdMax: number;
}
