import { RuleSettings } from '@ghostfolio/api/models/interfaces/rule-settings.interface';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { DEFAULT_LANGUAGE_CODE } from '@ghostfolio/common/config';
import { groupBy } from '@ghostfolio/common/helper';
import {
  PortfolioPosition,
  PortfolioReportRule,
  UserSettings
} from '@ghostfolio/common/interfaces';

import { Big } from 'big.js';

import { EvaluationResult } from './interfaces/evaluation-result.interface';
import { RuleInterface } from './interfaces/rule.interface';

export abstract class Rule<T extends RuleSettings> implements RuleInterface<T> {
  private key: string;
  private languageCode: string;

  public constructor(
    protected exchangeRateDataService: ExchangeRateDataService,
    {
      key,
      languageCode = DEFAULT_LANGUAGE_CODE
    }: {
      key: string;
      languageCode?: string; // TODO: Make mandatory
    }
  ) {
    this.key = key;
    this.languageCode = languageCode;
  }

  public getKey() {
    return this.key;
  }

  public getLanguageCode() {
    return this.languageCode;
  }

  public groupCurrentHoldingsByAttribute(
    holdings: PortfolioPosition[],
    attribute: keyof PortfolioPosition,
    baseCurrency: string
  ) {
    return Array.from(groupBy(attribute, holdings).entries()).map(
      ([attributeValue, objs]) => ({
        groupKey: attributeValue,
        investment: objs.reduce(
          (previousValue, currentValue) =>
            previousValue + currentValue.investment,
          0
        ),
        value: objs.reduce(
          (previousValue, currentValue) =>
            previousValue +
            this.exchangeRateDataService.toCurrency(
              new Big(currentValue.quantity)
                .mul(currentValue.marketPrice)
                .toNumber(),
              currentValue.currency,
              baseCurrency
            ),
          0
        )
      })
    );
  }

  public abstract evaluate(aRuleSettings: T): EvaluationResult;

  public abstract getConfiguration(): Partial<
    PortfolioReportRule['configuration']
  >;

  public abstract getName(): string;

  public abstract getSettings(aUserSettings: UserSettings): T;
}
