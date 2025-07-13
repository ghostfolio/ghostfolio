import { RuleSettings } from '@ghostfolio/api/models/interfaces/rule-settings.interface';
import { Rule } from '@ghostfolio/api/models/rule';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { I18nService } from '@ghostfolio/api/services/i18n/i18n.service';
import { PortfolioDetails, UserSettings } from '@ghostfolio/common/interfaces';

export class AccountClusterRiskSingleAccount extends Rule<RuleSettings> {
  private accounts: PortfolioDetails['accounts'];

  public constructor(
    protected exchangeRateDataService: ExchangeRateDataService,
    private i18nService: I18nService,
    languageCode: string,
    accounts: PortfolioDetails['accounts']
  ) {
    super(exchangeRateDataService, {
      languageCode,
      key: AccountClusterRiskSingleAccount.name
    });

    this.accounts = accounts;
  }

  public evaluate() {
    const accounts: string[] = Object.keys(this.accounts);

    if (accounts.length === 1) {
      return {
        evaluation: this.i18nService.getTranslation({
          id: 'rule.accountClusterRiskSingleAccount.false',
          languageCode: this.getLanguageCode()
        }),
        value: false
      };
    }

    return {
      evaluation: this.i18nService.getTranslation({
        id: 'rule.accountClusterRiskSingleAccount.true',
        languageCode: this.getLanguageCode(),
        placeholders: {
          accountsLength: accounts.length
        }
      }),
      value: true
    };
  }

  public getConfiguration() {
    return undefined;
  }

  public getName() {
    return this.i18nService.getTranslation({
      id: 'rule.accountClusterRiskSingleAccount',
      languageCode: this.getLanguageCode()
    });
  }

  public getCategoryName() {
    return this.i18nService.getTranslation({
      id: 'rule.accountClusterRisk.category',
      languageCode: this.getLanguageCode()
    });
  }

  public getSettings({ xRayRules }: UserSettings): RuleSettings {
    return {
      isActive: xRayRules?.[this.getKey()].isActive ?? true
    };
  }
}
