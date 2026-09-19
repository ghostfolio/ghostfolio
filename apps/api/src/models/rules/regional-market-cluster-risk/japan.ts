import { Rule } from '@ghostfolio/api/models/rule';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { I18nService } from '@ghostfolio/api/services/i18n/i18n.service';

import { Settings } from './interfaces/rule-settings.interface';

export class RegionalMarketClusterRiskJapan extends Rule<Settings> {
  private currentValueInBaseCurrency: number;
  private i18nService: I18nService;
  private japanValueInBaseCurrency: number;

  public constructor({
    currentValueInBaseCurrency,
    exchangeRateDataService,
    i18nService,
    japanValueInBaseCurrency,
    languageCode
  }: {
    currentValueInBaseCurrency: number;
    exchangeRateDataService: ExchangeRateDataService;
    i18nService: I18nService;
    japanValueInBaseCurrency: number;
    languageCode: string;
  }) {
    super(exchangeRateDataService, {
      languageCode,
      key: 'RegionalMarketClusterRiskJapan'
    });

    this.currentValueInBaseCurrency = currentValueInBaseCurrency;
    this.i18nService = i18nService;
    this.japanValueInBaseCurrency = japanValueInBaseCurrency;
  }

  public evaluate(ruleSettings: Settings) {
    const japanMarketValueRatio = this.currentValueInBaseCurrency
      ? this.japanValueInBaseCurrency / this.currentValueInBaseCurrency
      : 0;

    if (japanMarketValueRatio > ruleSettings.thresholdMax) {
      return {
        evaluation: this.i18nService.getTranslation({
          id: 'rule.regionalMarketClusterRiskJapan.false.max',
          languageCode: this.getLanguageCode(),
          placeholders: {
            thresholdMax: (ruleSettings.thresholdMax * 100).toPrecision(3),
            valueRatio: (japanMarketValueRatio * 100).toPrecision(3)
          }
        }),
        value: false
      };
    } else if (japanMarketValueRatio < ruleSettings.thresholdMin) {
      return {
        evaluation: this.i18nService.getTranslation({
          id: 'rule.regionalMarketClusterRiskJapan.false.min',
          languageCode: this.getLanguageCode(),
          placeholders: {
            thresholdMin: (ruleSettings.thresholdMin * 100).toPrecision(3),
            valueRatio: (japanMarketValueRatio * 100).toPrecision(3)
          }
        }),
        value: false
      };
    }

    return {
      evaluation: this.i18nService.getTranslation({
        id: 'rule.regionalMarketClusterRiskJapan.true',
        languageCode: this.getLanguageCode(),
        placeholders: {
          thresholdMax: (ruleSettings.thresholdMax * 100).toPrecision(3),
          thresholdMin: (ruleSettings.thresholdMin * 100).toPrecision(3),
          valueRatio: (japanMarketValueRatio * 100).toPrecision(3)
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
      id: 'rule.regionalMarketClusterRiskJapan',
      languageCode: this.getLanguageCode()
    });
  }
}
