import { RuleSettings } from '@ghostfolio/api/models/interfaces/rule-settings.interface';
import { Rule } from '@ghostfolio/api/models/rule';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { I18nService } from '@ghostfolio/api/services/i18n/i18n.service';
import { UserSettings } from '@ghostfolio/common/interfaces';

export class BuyingPower extends Rule<Settings> {
  private buyingPower: number;

  public constructor(
    protected exchangeRateDataService: ExchangeRateDataService,
    private i18nService: I18nService,
    buyingPower: number,
    languageCode: string
  ) {
    super(exchangeRateDataService, {
      languageCode,
      key: BuyingPower.name
    });

    this.buyingPower = buyingPower;
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
            thresholdMin: ruleSettings.thresholdMin
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
          thresholdMin: ruleSettings.thresholdMin
        }
      }),
      value: true
    };
  }

  public getCategoryName() {
    return this.i18nService.getTranslation({
      id: 'rule.liquidity.category',
      languageCode: this.getLanguageCode()
    });
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

  public getSettings({ baseCurrency, xRayRules }: UserSettings): Settings {
    return {
      baseCurrency,
      isActive: xRayRules?.[this.getKey()]?.isActive ?? true,
      thresholdMin: xRayRules?.[this.getKey()]?.thresholdMin ?? 0
    };
  }
}

interface Settings extends RuleSettings {
  baseCurrency: string;
  thresholdMin: number;
}
