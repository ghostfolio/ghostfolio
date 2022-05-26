import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
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

  public constructor() {}
}
