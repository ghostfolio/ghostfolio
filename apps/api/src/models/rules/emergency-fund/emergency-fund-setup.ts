import { RuleSettings } from '@ghostfolio/api/models/interfaces/rule-settings.interface';
import { Rule } from '@ghostfolio/api/models/rule';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { UserSettings } from '@ghostfolio/common/interfaces';

export class EmergencyFundSetup extends Rule<Settings> {
  public constructor(
    protected exchangeRateDataService: ExchangeRateDataService
  ) {
    super(exchangeRateDataService, {
      name: 'Emergency Fund: Set up'
    });
  }

  public evaluate(ruleSettings: Settings) {
    if (ruleSettings.threshold > 0) {
      return {
        evaluation: `You have set up an emergency fund`,
        value: true
      };
    }

    return {
      evaluation: `You have not set up an emergency fund yet`,
      value: false
    };
  }

  public getSettings(aUserSettings: UserSettings): Settings {
    return {
      baseCurrency: aUserSettings.baseCurrency,
      isActive: true,
      threshold: aUserSettings.emergencyFund
    };
  }
}

interface Settings extends RuleSettings {
  baseCurrency: string;
  threshold: number;
}
