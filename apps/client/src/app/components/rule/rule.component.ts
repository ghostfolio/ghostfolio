import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
} from '@angular/core';
import { PortfolioReportRule } from '@ghostfolio/common/interfaces';

@Component({
  selector: 'gf-rule',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './rule.component.html',
  styleUrls: ['./rule.component.scss']
})
export class RuleComponent implements OnInit {
  @Input() isLoading: boolean;
  @Input() rule: PortfolioReportRule;

  public constructor() {}

  public ngOnInit() {}
}
