import { getLocale } from '@ghostfolio/common/helper';
import { AccountBalancesResponse } from '@ghostfolio/common/interfaces';

import {
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  ViewChild
} from '@angular/core';
import {
  FormGroup,
  FormControl,
  Validators,
  ReactiveFormsModule
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { DateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { get } from 'lodash';
import { Subject } from 'rxjs';

import { GfValueComponent } from '../value';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    GfValueComponent,
    MatButtonModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatMenuModule,
    MatSortModule,
    MatTableModule,
    ReactiveFormsModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'gf-account-balances',
  standalone: true,
  styleUrls: ['./account-balances.component.scss'],
  templateUrl: './account-balances.component.html'
})
export class GfAccountBalancesComponent
  implements OnChanges, OnDestroy, OnInit
{
  @Input() accountBalances: AccountBalancesResponse['balances'];
  @Input() accountCurrency: string;
  @Input() accountId: string;
  @Input() locale = getLocale();
  @Input() showActions = true;

  @Output() accountBalanceCreated = new EventEmitter<{
    balance: number;
    date: Date;
  }>();
  @Output() accountBalanceDeleted = new EventEmitter<string>();

  @ViewChild(MatSort) sort: MatSort;

  public accountBalanceForm = new FormGroup({
    balance: new FormControl(0, Validators.required),
    date: new FormControl(new Date(), Validators.required)
  });

  public dataSource: MatTableDataSource<
    AccountBalancesResponse['balances'][0]
  > = new MatTableDataSource();

  public displayedColumns: string[] = ['date', 'value', 'actions'];
  public Validators = Validators;

  private unsubscribeSubject = new Subject<void>();

  public constructor(private dateAdapter: DateAdapter<any>) {}

  public ngOnInit() {
    this.dateAdapter.setLocale(this.locale);
  }

  public ngOnChanges() {
    if (this.accountBalances) {
      this.dataSource = new MatTableDataSource(this.accountBalances);

      this.dataSource.sort = this.sort;
      this.dataSource.sortingDataAccessor = get;
    }
  }

  public onDeleteAccountBalance(aId: string) {
    const confirmation = confirm(
      $localize`Do you really want to delete this account balance?`
    );

    if (confirmation) {
      this.accountBalanceDeleted.emit(aId);
    }
  }

  public onSubmitAccountBalance() {
    this.accountBalanceCreated.emit(this.accountBalanceForm.getRawValue());
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
