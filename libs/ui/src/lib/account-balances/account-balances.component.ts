import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnDestroy,
  OnInit
} from '@angular/core';
import { DataService } from '@ghostfolio/client/services/data.service';
import { AccountBalance } from '@ghostfolio/common/interfaces';
import { Subject, takeUntil } from 'rxjs';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'gf-account-balances',
  styleUrls: ['./account-balances.component.scss'],
  templateUrl: './account-balances.component.html'
})
export class AccountBalancesComponent implements OnDestroy, OnInit {
  @Input() accountId: string;

  public balances: AccountBalance[];
  public displayedColumns: string[] = ['date', 'value'];

  private unsubscribeSubject = new Subject<void>();

  public constructor(private dataService: DataService) {}

  public fetchBalances() {
    this.dataService
      .fetchAccountBalances(this.accountId)
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(({ balances }) => {
        console.log({ balances });
        this.balances = balances;
      });
  }

  public ngOnInit() {
    this.fetchBalances();
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
