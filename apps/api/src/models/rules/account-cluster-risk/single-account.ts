import { RuleSettings } from '@ghostfolio/api/models/interfaces/rule-settings.interface';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data.service';
import { PortfolioDetails, UserSettings } from '@ghostfolio/common/interfaces';

import { Rule } from '../../rule';

export class AccountClusterRiskSingleAccount extends Rule<RuleSettings> {
  public constructor(
    protected exchangeRateDataService: ExchangeRateDataService,
    private accounts: PortfolioDetails['accounts']
  ) {
    super(exchangeRateDataService, {
      name: 'Single Account'
    });
  }

  public evaluate() {
    const accounts: string[] = Object.keys(this.accounts);

    if (accounts.length === 1) {
      return {
        evaluation: `All your investment is managed by a single account`,
        value: false
      };
    }

    return {
      evaluation: `Your investment is managed by ${accounts.length} accounts`,
      value: true
    };
  }

  public getSettings(aUserSettings: UserSettings): RuleSettings {
    return {
      isActive: true
    };
  }
}
