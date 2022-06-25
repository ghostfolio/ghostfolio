import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'gf-premium-indicator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './premium-indicator.component.html',
  styleUrls: ['./premium-indicator.component.scss']
})
export class PremiumIndicatorComponent {
  @Input() enableLink = true;

  public constructor() {}
}
