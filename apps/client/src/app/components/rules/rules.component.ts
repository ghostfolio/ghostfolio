import { PortfolioReportRule } from '@ghostfolio/common/interfaces';

import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'gf-rules',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './rules.component.html',
  styleUrls: ['./rules.component.scss']
})
export class RulesComponent {
  @Input() hasPermissionToCreateOrder: boolean;
  @Input() rules: PortfolioReportRule[];

  public constructor() {}
}
