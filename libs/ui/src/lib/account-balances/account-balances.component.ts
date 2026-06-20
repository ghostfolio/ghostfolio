import { CreateAccountBalanceDto } from '@ghostfolio/common/dtos';
import { ConfirmationDialogType } from '@ghostfolio/common/enums';
import { DATE_FORMAT, getLocale } from '@ghostfolio/common/helper';
import { AccountBalancesResponse } from '@ghostfolio/common/interfaces';
import { validateObjectForForm } from '@ghostfolio/common/utils';
import { NotificationService } from '@ghostfolio/ui/notifications';

import {
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  OnChanges,
  OnInit,
  Output,
  inject,
  input,
  viewChild
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
import { IonIcon } from '@ionic/angular/standalone';
import { format } from 'date-fns';
import { addIcons } from 'ionicons';
import {
  calendarClearOutline,
  ellipsisHorizontal,
  trashOutline
} from 'ionicons/icons';
import { get, isNil } from 'lodash';

import { GfValueComponent } from '../value';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    GfValueComponent,
    IonIcon,
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
  styleUrls: ['./account-balances.component.scss'],
  templateUrl: './account-balances.component.html'
})
export class GfAccountBalancesComponent implements OnChanges, OnInit {
  @Output() accountBalanceCreated = new EventEmitter<CreateAccountBalanceDto>();
  @Output() accountBalanceDeleted = new EventEmitter<string>();

  public readonly accountBalances =
    input.required<AccountBalancesResponse['balances']>();
  public readonly accountCurrency = input.required<string>();
  public readonly accountId = input.required<string>();
  public readonly displayedColumns: string[] = ['date', 'value', 'actions'];
  public readonly locale = input(getLocale());
  public readonly showActions = input(true);
  public readonly sort = viewChild(MatSort);

  public accountBalanceForm = new FormGroup({
    balance: new FormControl(0, (control) => Validators.required(control)),
    date: new FormControl(new Date(), (control) => Validators.required(control))
  });

  public dataSource = new MatTableDataSource<
    AccountBalancesResponse['balances'][0]
  >();

  private dateAdapter = inject<DateAdapter<Date, string>>(DateAdapter);
  private notificationService = inject(NotificationService);

  public constructor() {
    addIcons({ calendarClearOutline, ellipsisHorizontal, trashOutline });
  }

  public ngOnInit() {
    this.dateAdapter.setLocale(this.locale());
  }

  public ngOnChanges() {
    if (this.accountBalances()) {
      this.dataSource = new MatTableDataSource(this.accountBalances());

      this.dataSource.sort = this.sort();
      this.dataSource.sortingDataAccessor = get;
    }
  }

  public onDeleteAccountBalance(aId: string) {
    this.notificationService.confirm({
      confirmFn: () => {
        this.accountBalanceDeleted.emit(aId);
      },
      confirmType: ConfirmationDialogType.Warn,
      title: $localize`Do you really want to delete this account balance?`
    });
  }

  public async onSubmitAccountBalance() {
    const { balance, date } = this.accountBalanceForm.value;

    if (isNil(balance) || !date) {
      return;
    }

    const accountBalance: CreateAccountBalanceDto = {
      balance,
      accountId: this.accountId(),
      date: format(date, DATE_FORMAT)
    };

    try {
      await validateObjectForForm({
        classDto: CreateAccountBalanceDto,
        form: this.accountBalanceForm,
        object: accountBalance
      });
    } catch (error) {
      console.error(error);
      return;
    }

    this.accountBalanceCreated.emit(accountBalance);
  }
}
