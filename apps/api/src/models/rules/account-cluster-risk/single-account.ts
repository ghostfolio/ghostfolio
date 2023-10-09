import { RuleSettings } from '@ghostfolio/api/models/interfaces/rule-settings.interface';
import { Rule } from '@ghostfolio/api/models/rule';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { PortfolioDetails, UserSettings } from '@ghostfolio/common/interfaces';

export class AccountClusterRiskSingleAccount extends Rule<RuleSettings> {
  private accounts: PortfolioDetails['accounts'];

  public constructor(
    protected exchangeRateDataService: ExchangeRateDataService,
    accounts: PortfolioDetails['accounts']
  ) {
    super(exchangeRateDataService, {
      name: 'Single Account'
    });

    this.accounts = accounts;
  }

  public evaluate() {
    const accounts: string[] = Object.keys(this.accounts);

    if (accounts.length === 1) {
      return {
        evaluation: `Your net worth is managed by a single account`,
        value: false
      };
    }

    return {
      evaluation: `Your net worth is managed by ${accounts.length} accounts`,
      value: true
    };
  }

  public getSettings(aUserSettings: UserSettings): RuleSettings {
    return {
      isActive: true
    };
  }
}
