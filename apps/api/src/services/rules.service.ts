import { Injectable } from '@nestjs/common';
import { Rule } from '../models/rule';
import { PortfolioPosition } from '@ghostfolio/common/interfaces';
import { Currency } from '@prisma/client';
import { RuleSettings } from '@ghostfolio/api/models/interfaces/rule-settings.interface';

@Injectable()
export class RulesService {
  public constructor() {}

  public async evaluate<T extends RuleSettings>(
    details: { [p: string]: PortfolioPosition },
    fees: number,
    aRules: Rule<T>[],
    aUserSettings: { baseCurrency: Currency }
  ) {
    return aRules
      .filter((rule) => {
        return rule.getSettings(aUserSettings)?.isActive;
      })
      .map((rule) => {
        const evaluationResult = rule.evaluate(
          details,
          fees,
          rule.getSettings(aUserSettings)
        );
        return { ...evaluationResult, name: rule.getName() };
      });
  }
}
