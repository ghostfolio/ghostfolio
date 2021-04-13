import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
} from '@angular/core';
import { Currency } from '@prisma/client';
import { PortfolioPerformance } from 'apps/api/src/app/portfolio/interfaces/portfolio-performance.interface';

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
