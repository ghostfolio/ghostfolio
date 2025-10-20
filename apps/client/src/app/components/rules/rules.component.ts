import { UpdateUserSettingDto } from '@ghostfolio/api/app/user/update-user-setting.dto';
import { GfRuleComponent } from '@ghostfolio/client/components/rule/rule.component';
import {
  PortfolioReportRule,
  XRayRulesSettings
} from '@ghostfolio/common/interfaces';

import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output
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
  @Input() rules: PortfolioReportRule[];
  @Input() settings: XRayRulesSettings;

  @Output() rulesUpdated = new EventEmitter<UpdateUserSettingDto>();

  public onRuleUpdated(event: UpdateUserSettingDto) {
    this.rulesUpdated.emit(event);
  }
}
