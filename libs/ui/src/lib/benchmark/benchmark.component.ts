import { getLocale, resolveMarketCondition } from '@ghostfolio/common/helper';
import { Benchmark, User } from '@ghostfolio/common/interfaces';
import { translate } from '@ghostfolio/ui/i18n';

import { CommonModule } from '@angular/common';
import {
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges
} from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

import { GfTrendIndicatorComponent } from '../trend-indicator';
import { GfValueComponent } from '../value';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    GfTrendIndicatorComponent,
    GfValueComponent,
    MatTableModule,
    NgxSkeletonLoaderModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'gf-benchmark',
  standalone: true,
  styleUrls: ['./benchmark.component.scss'],
  templateUrl: './benchmark.component.html'
})
export class GfBenchmarkComponent implements OnChanges {
  @Input() benchmarks: Benchmark[];
  @Input() locale = getLocale();
  @Input() user: User;

  public displayedColumns = ['name', 'date', 'change', 'marketCondition'];
  public resolveMarketCondition = resolveMarketCondition;
  public translate = translate;

  public constructor() {}

  public ngOnChanges() {
    if (this.user?.settings?.isExperimentalFeatures) {
      this.displayedColumns = [
        'name',
        'trend50d',
        'trend200d',
        'date',
        'change',
        'marketCondition'
      ];
    }
  }
}
