import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { PortfolioReportRule } from '@ghostfolio/api/app/portfolio/interfaces/portfolio-report.interface';

@Component({
  selector: 'gf-rules',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './rules.component.html',
  styleUrls: ['./rules.component.scss']
})
export class RulesComponent {
  @Input() rules: PortfolioReportRule;

  public constructor() {}
}
