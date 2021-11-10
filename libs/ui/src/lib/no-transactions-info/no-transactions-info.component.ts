import {
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  Input
} from '@angular/core';

@Component({
  selector: 'gf-no-transactions-info-indicator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './no-transactions-info.component.html',
  styleUrls: ['./no-transactions-info.component.scss']
})
export class NoTransactionsInfoComponent {
  @HostBinding('class.has-border') @Input() hasBorder = true;

  public constructor() {}
}
