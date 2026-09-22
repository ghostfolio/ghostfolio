import { Rule } from '@ghostfolio/api/models/rule';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { I18nService } from '@ghostfolio/api/services/i18n/i18n.service';
import { PortfolioDetails, RuleSettings } from '@ghostfolio/common/interfaces';

export class AccountClusterRiskSingleAccount extends Rule<RuleSettings> {
  private accounts: PortfolioDetails['accounts'];
  private i18nService: I18nService;

  public constructor({
    accounts,
    exchangeRateDataService,
    i18nService,
    languageCode
  }: {
    accounts: PortfolioDetails['accounts'];
    exchangeRateDataService: ExchangeRateDataService;
    i18nService: I18nService;
    languageCode: string;
  }) {
    super({
      exchangeRateDataService,
      languageCode,
      key: 'AccountClusterRiskSingleAccount'
    });

    this.accounts = accounts;
    this.i18nService = i18nService;
  }

  public evaluate() {
    const accountIds: string[] = Object.keys(this.accounts);

    if (accountIds.length === 0) {
      return {
        evaluation: this.i18nService.getTranslation({
          id: 'rule.accountClusterRiskSingleAccount.false.invalid',
          languageCode: this.getLanguageCode()
        }),
        value: false
      };
    } else if (accountIds.length === 1) {
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
          accountsLength: accountIds.length
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
}
