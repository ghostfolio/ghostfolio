import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  OnInit
} from '@angular/core';
import { PortfolioSummary } from '@ghostfolio/common/interfaces';
import { formatDistanceToNow } from 'date-fns';

@Component({
  selector: 'gf-portfolio-summary',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './portfolio-summary.component.html',
  styleUrls: ['./portfolio-summary.component.scss']
})
export class PortfolioSummaryComponent implements OnChanges, OnInit {
  @Input() baseCurrency: string;
  @Input() isLoading: boolean;
  @Input() locale: string;
  @Input() summary: PortfolioSummary;

  public timeInMarket: string;

  public constructor() {}

  public ngOnInit() {}

  public ngOnChanges() {
    if (this.summary) {
      if (this.summary.firstOrderDate) {
        this.timeInMarket = formatDistanceToNow(this.summary.firstOrderDate);
      } else {
        this.timeInMarket = '-';
      }
    } else {
      this.timeInMarket = undefined;
    }
  }
}
