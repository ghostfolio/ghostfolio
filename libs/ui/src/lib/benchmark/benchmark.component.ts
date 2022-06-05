import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { resolveMarketCondition } from '@ghostfolio/common/helper';
import { Benchmark } from '@ghostfolio/common/interfaces';

@Component({
  selector: 'gf-benchmark',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './benchmark.component.html',
  styleUrls: ['./benchmark.component.scss']
})
export class BenchmarkComponent {
  @Input() benchmark: Benchmark;
  @Input() locale: string;

  public resolveMarketCondition = resolveMarketCondition;

  public constructor() {}
}
