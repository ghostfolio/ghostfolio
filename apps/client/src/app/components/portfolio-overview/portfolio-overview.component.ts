import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  OnInit
} from '@angular/core';
import { PortfolioOverview } from '@ghostfolio/helper/interfaces';
import { Currency } from '@prisma/client';

@Component({
  selector: 'gf-portfolio-overview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './portfolio-overview.component.html',
  styleUrls: ['./portfolio-overview.component.scss']
})
export class PortfolioOverviewComponent implements OnChanges, OnInit {
  @Input() baseCurrency: Currency;
  @Input() isLoading: boolean;
  @Input() locale: string;
  @Input() overview: PortfolioOverview;

  public constructor() {}

  public ngOnInit() {}

  public ngOnChanges() {}
}
