import { RuleSettings } from '@ghostfolio/api/models/interfaces/rule-settings.interface';
import { Rule } from '@ghostfolio/api/models/rule';
import {
  PortfolioReportRule,
  UserSettings
} from '@ghostfolio/common/interfaces';

import { Injectable } from '@nestjs/common';

import { RULE_CATEGORY_MAPPING } from './rule-category-mapping';

@Injectable()
export class RulesService {
  public async evaluate<T extends RuleSettings>(
    aRules: Rule<T>[],
    aUserSettings: UserSettings
  ): Promise<PortfolioReportRule[]> {
    return aRules.map((rule) => {
      const settings = rule.getSettings(aUserSettings);
      const category =
        RULE_CATEGORY_MAPPING[rule.constructor.name] || 'Unknown';

      if (settings?.isActive) {
        const { evaluation, value } = rule.evaluate(settings);

        return {
          evaluation,
          value,
          category,
          configuration: rule.getConfiguration(),
          isActive: true,
          key: rule.getKey(),
          name: rule.getName()
        };
      } else {
        return {
          category,
          isActive: false,
          key: rule.getKey(),
          name: rule.getName()
        };
      }
    });
  }
}
