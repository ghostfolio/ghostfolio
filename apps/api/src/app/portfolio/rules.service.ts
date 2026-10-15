import { Rule } from '@ghostfolio/api/models/rule';
import { getRuleSettings } from '@ghostfolio/api/models/rules/rule-settings';
import {
  PortfolioReportRule,
  RuleSettings,
  UserSettings
} from '@ghostfolio/common/interfaces';

import { Injectable } from '@nestjs/common';

@Injectable()
export class RulesService {
  public async evaluate<T extends RuleSettings>(
    aRules: Rule<T>[],
    aUserSettings: UserSettings
  ): Promise<PortfolioReportRule[]> {
    return aRules.map((rule) => {
      const settings = getRuleSettings<T>({
        key: rule.getKey(),
        userSettings: aUserSettings
      });

      if (settings.isActive) {
        const { evaluation, value } = rule.evaluate(settings);

        return {
          evaluation,
          value,
          configuration: rule.getConfiguration(),
          isActive: true,
          key: rule.getKey(),
          name: rule.getName()
        };
      } else {
        return {
          isActive: false,
          key: rule.getKey(),
          name: rule.getName()
        };
      }
    });
  }
}
