import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

@Component({
  selector: 'gf-no-transactions-info-indicator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './no-transactions-info.component.html',
  styleUrls: ['./no-transactions-info.component.scss']
})
export class NoTransactionsInfoComponent implements OnInit {
  public constructor() {}

  public ngOnInit() {}
}
