import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
} from '@angular/core';
import { PortfolioPerformance } from '@ghostfolio/helper/interfaces';
import { Currency } from '@prisma/client';

@Component({
  selector: 'gf-portfolio-performance',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './portfolio-performance.component.html',
  styleUrls: ['./portfolio-performance.component.scss']
})
export class PortfolioPerformanceComponent implements OnInit {
  @Input() baseCurrency: Currency;
  @Input() isLoading: boolean;
  @Input() locale: string;
  @Input() performance: PortfolioPerformance;

  public constructor() {}

  public ngOnInit() {}
}
