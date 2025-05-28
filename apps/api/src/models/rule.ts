import { RuleSettings } from '@ghostfolio/api/models/interfaces/rule-settings.interface';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
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
  private name: string;

  public constructor(
    protected exchangeRateDataService: ExchangeRateDataService,
    {
      key,
      name
    }: {
      key: string;
      name: string;
    }
  ) {
    this.key = key;
    this.name = name;
  }

  public getKey() {
    return this.key;
  }

  public getName() {
    return this.name;
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

  public abstract getSettings(aUserSettings: UserSettings): T;
}
