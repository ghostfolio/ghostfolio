import { RuleSettings } from '@ghostfolio/api/models/interfaces/rule-settings.interface';
import { Rule } from '@ghostfolio/api/models/rule';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { UserSettings } from '@ghostfolio/common/interfaces';

export class EmergencyFundSetup extends Rule<Settings> {
  private emergencyFund: number;

  public constructor(
    protected exchangeRateDataService: ExchangeRateDataService,
    emergencyFund: number
  ) {
    super(exchangeRateDataService, {
      key: EmergencyFundSetup.name,
      name: 'Emergency Fund: Set up'
    });

    this.emergencyFund = emergencyFund;
  }

  public evaluate(ruleSettings: Settings) {
    if (this.emergencyFund < ruleSettings.thresholdMin) {
      return {
        evaluation: 'No emergency fund has been set up',
        value: false
      };
    }

    return {
      evaluation: 'An emergency fund has been set up',
      value: true
    };
  }

  public getSettings(aUserSettings: UserSettings): Settings {
    return {
      baseCurrency: aUserSettings.baseCurrency,
      isActive: true,
      thresholdMin: 0
    };
  }
}

interface Settings extends RuleSettings {
  baseCurrency: string;
  thresholdMin: number;
}
