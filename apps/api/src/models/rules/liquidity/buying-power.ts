import { Rule } from '@ghostfolio/api/models/rule';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { I18nService } from '@ghostfolio/api/services/i18n/i18n.service';
import { RuleSettings } from '@ghostfolio/common/interfaces';

export class BuyingPower extends Rule<Settings> {
  private buyingPower: number;
  private i18nService: I18nService;

  public constructor({
    buyingPower,
    exchangeRateDataService,
    i18nService,
    languageCode
  }: {
    buyingPower: number;
    exchangeRateDataService: ExchangeRateDataService;
    i18nService: I18nService;
    languageCode: string;
  }) {
    super({ exchangeRateDataService, languageCode, key: 'BuyingPower' });

    this.buyingPower = buyingPower;
    this.i18nService = i18nService;
  }

  public evaluate(ruleSettings: Settings) {
    if (this.buyingPower === 0) {
      return {
        evaluation: this.i18nService.getTranslation({
          id: 'rule.liquidityBuyingPower.false.zero',
          languageCode: this.getLanguageCode(),
          placeholders: {
            baseCurrency: ruleSettings.baseCurrency
          }
        }),
        value: false
      };
    } else if (this.buyingPower < ruleSettings.thresholdMin) {
      return {
        evaluation: this.i18nService.getTranslation({
          id: 'rule.liquidityBuyingPower.false.min',
          languageCode: this.getLanguageCode(),
          placeholders: {
            baseCurrency: ruleSettings.baseCurrency,
            thresholdMin: ruleSettings.thresholdMin.toLocaleString(
              ruleSettings.locale
            )
          }
        }),
        value: false
      };
    }

    return {
      evaluation: this.i18nService.getTranslation({
        id: 'rule.liquidityBuyingPower.true',
        languageCode: this.getLanguageCode(),
        placeholders: {
          baseCurrency: ruleSettings.baseCurrency,
          thresholdMin: ruleSettings.thresholdMin.toLocaleString(
            ruleSettings.locale
          )
        }
      }),
      value: true
    };
  }

  public getConfiguration() {
    return {
      threshold: {
        max: 200000,
        min: 0,
        step: 1000,
        unit: ''
      },
      thresholdMin: true
    };
  }

  public getName() {
    return this.i18nService.getTranslation({
      id: 'rule.liquidityBuyingPower',
      languageCode: this.getLanguageCode()
    });
  }
}

interface Settings extends RuleSettings {
  baseCurrency: string;
  thresholdMin: number;
}
