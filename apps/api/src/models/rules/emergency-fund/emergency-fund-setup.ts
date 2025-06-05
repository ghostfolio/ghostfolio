import { RuleSettings } from '@ghostfolio/api/models/interfaces/rule-settings.interface';
import { Rule } from '@ghostfolio/api/models/rule';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { I18nService } from '@ghostfolio/api/services/i18n/i18n.service';
import { UserSettings } from '@ghostfolio/common/interfaces';

export class EmergencyFundSetup extends Rule<Settings> {
  private emergencyFund: number;
  private i18nService = new I18nService();

  public constructor(
    protected exchangeRateDataService: ExchangeRateDataService,
    languageCode: string,
    emergencyFund: number
  ) {
    super(exchangeRateDataService, {
      languageCode,
      key: EmergencyFundSetup.name
    });

    this.emergencyFund = emergencyFund;
  }

  public evaluate() {
    if (!this.emergencyFund) {
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

  public getSettings({ baseCurrency, xRayRules }: UserSettings): Settings {
    return {
      baseCurrency,
      isActive: xRayRules?.[this.getKey()].isActive ?? true
    };
  }
}

interface Settings extends RuleSettings {
  baseCurrency: string;
}
