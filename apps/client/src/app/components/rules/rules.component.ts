import { GfRuleComponent } from '@ghostfolio/client/components/rule/rule.component';
import { UpdateUserSettingDto } from '@ghostfolio/common/dtos';
import {
  PortfolioReportRule,
  XRayRulesSettings
} from '@ghostfolio/common/interfaces';

import {
  ChangeDetectionStrategy,
  Component,
  Input,
  output
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GfRuleComponent, MatButtonModule, MatCardModule],
  selector: 'gf-rules',
  styleUrls: ['./rules.component.scss'],
  templateUrl: './rules.component.html'
})
export class GfRulesComponent {
  @Input() categoryName: string;
  @Input() hasPermissionToUpdateUserSettings: boolean;
  @Input() isLoading: boolean;
  @Input() locale?: string;
  @Input() rules: PortfolioReportRule[];
  @Input() settings?: XRayRulesSettings;

  public readonly rulesUpdated = output<UpdateUserSettingDto>();

  protected onRuleUpdated(event: UpdateUserSettingDto) {
    this.rulesUpdated.emit(event);
  }
}
