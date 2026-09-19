import { Rule } from '@ghostfolio/api/models/rule';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { I18nService } from '@ghostfolio/api/services/i18n/i18n.service';
import { RuleSettings } from '@ghostfolio/common/interfaces';

export class EmergencyFundSetup extends Rule<Settings> {
  private emergencyFundInBaseCurrency: number;
  private i18nService: I18nService;

  public constructor({
    emergencyFundInBaseCurrency,
    exchangeRateDataService,
    i18nService,
    languageCode
  }: {
    emergencyFundInBaseCurrency: number;
    exchangeRateDataService: ExchangeRateDataService;
    i18nService: I18nService;
    languageCode: string;
  }) {
    super({ exchangeRateDataService, languageCode, key: 'EmergencyFundSetup' });

    this.emergencyFundInBaseCurrency = emergencyFundInBaseCurrency;
    this.i18nService = i18nService;
  }

  public evaluate() {
    if (!this.emergencyFundInBaseCurrency) {
      return {
        evaluation: this.i18nService.getTranslation({
          id: 'rule.emergencyFundSetup.false',
          languageCode: this.getLanguageCode()
        }),
        value: false
      };
    }

    return {
      evaluation: this.i18nService.getTranslation({
        id: 'rule.emergencyFundSetup.true',
        languageCode: this.getLanguageCode()
      }),
      value: true
    };
  }

  public getConfiguration() {
    return undefined;
  }

  public getName() {
    return this.i18nService.getTranslation({
      id: 'rule.emergencyFundSetup',
      languageCode: this.getLanguageCode()
    });
  }
}

interface Settings extends RuleSettings {
  baseCurrency: string;
}
