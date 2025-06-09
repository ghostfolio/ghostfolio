import { RuleSettings } from '@ghostfolio/api/models/interfaces/rule-settings.interface';
import { Rule } from '@ghostfolio/api/models/rule';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { I18nService } from '@ghostfolio/api/services/i18n/i18n.service';
import { UserSettings } from '@ghostfolio/common/interfaces';

export class FeeRatioInitialInvestment extends Rule<Settings> {
  private fees: number;
  private totalInvestment: number;

  public constructor(
    protected exchangeRateDataService: ExchangeRateDataService,
    private i18nService: I18nService,
    languageCode: string,
    totalInvestment: number,
    fees: number
  ) {
    super(exchangeRateDataService, {
      languageCode,
      key: FeeRatioInitialInvestment.name
    });

    this.fees = fees;
    this.totalInvestment = totalInvestment;
  }

  public evaluate(ruleSettings: Settings) {
    const feeRatio = this.totalInvestment
      ? this.fees / this.totalInvestment
      : 0;

    if (feeRatio > ruleSettings.thresholdMax) {
      return {
        evaluation: this.i18nService.getTranslation({
          id: 'rule.feeRatioInitialInvestment.false',
          languageCode: this.getLanguageCode(),
          placeholders: {
            feeRatio: (ruleSettings.thresholdMax * 100).toFixed(2),
            thresholdMax: (feeRatio * 100).toPrecision(3)
          }
        }),
        value: false
      };
    }

    return {
      evaluation: this.i18nService.getTranslation({
        id: 'rule.feeRatioInitialInvestment.true',
        languageCode: this.getLanguageCode(),
        placeholders: {
          feeRatio: (feeRatio * 100).toPrecision(3),
          thresholdMax: (ruleSettings.thresholdMax * 100).toFixed(2)
        }
      }),
      value: true
    };
  }

  public getConfiguration() {
    return {
      threshold: {
        max: 0.1,
        min: 0,
        step: 0.0025,
        unit: '%'
      },
      thresholdMax: true
    };
  }

  public getName() {
    return this.i18nService.getTranslation({
      id: 'rule.feeRatioInitialInvestment',
      languageCode: this.getLanguageCode()
    });
  }

  public getSettings({ baseCurrency, xRayRules }: UserSettings): Settings {
    return {
      baseCurrency,
      isActive: xRayRules?.[this.getKey()].isActive ?? true,
      thresholdMax: xRayRules?.[this.getKey()]?.thresholdMax ?? 0.01
    };
  }
}

interface Settings extends RuleSettings {
  baseCurrency: string;
  thresholdMax: number;
}
