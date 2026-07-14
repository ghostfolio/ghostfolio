import {
  canDeleteUser,
  getCountryName,
  getSum
} from '@ghostfolio/common/helper';
import { AdminUserResponse } from '@ghostfolio/common/interfaces';
import { AdminService, DataService } from '@ghostfolio/ui/services';
import { GfValueComponent } from '@ghostfolio/ui/value';

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  DestroyRef,
  inject,
  OnInit
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { IonIcon } from '@ionic/angular/standalone';
import { Subscription } from '@prisma/client';
import { Big } from 'big.js';
import { differenceInDays } from 'date-fns';
import { addIcons } from 'ionicons';
import { ellipsisVertical } from 'ionicons/icons';
import { EMPTY } from 'rxjs';
import { catchError } from 'rxjs/operators';

import {
  UserDetailDialogParams,
  UserDetailDialogResult
} from './interfaces/interfaces';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'd-flex flex-column h-100' },
  imports: [
    GfValueComponent,
    IonIcon,
    MatButtonModule,
    MatDialogModule,
    MatMenuModule,
    MatTableModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'gf-user-detail-dialog',
  styleUrls: ['./user-detail-dialog.component.scss'],
  templateUrl: './user-detail-dialog.html'
})
export class GfUserDetailDialogComponent implements OnInit {
  protected readonly baseCurrency: string;
  protected readonly canDeleteUser = canDeleteUser;
  protected readonly getCountryName = getCountryName;
  protected readonly subscriptionsDataSource =
    new MatTableDataSource<Subscription>();
  protected readonly subscriptionsDisplayedColumns = [
    'createdAt',
    'type',
    'price',
    'expiresAt'
  ];
  protected user: AdminUserResponse;

  protected readonly data = inject<UserDetailDialogParams>(MAT_DIALOG_DATA);

  private readonly adminService = inject(AdminService);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly dataService = inject(DataService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialogRef =
    inject<MatDialogRef<GfUserDetailDialogComponent, UserDetailDialogResult>>(
      MatDialogRef
    );

  public constructor() {
    this.baseCurrency = this.dataService.fetchInfo().baseCurrency;

    addIcons({
      ellipsisVertical
    });
  }

  public ngOnInit() {
    this.adminService
      .fetchUserById(this.data.userId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => {
          this.dialogRef.close();

          return EMPTY;
        })
      )
      .subscribe((user) => {
        this.user = user;

        this.subscriptionsDataSource.data = this.user.subscriptions ?? [];

        this.changeDetectorRef.markForCheck();
      });
  }

  protected deleteUser() {
    this.dialogRef.close({
      action: 'delete',
      userId: this.data.userId
    });
  }

  protected getSum() {
    return getSum(
      this.subscriptionsDataSource.data
        .filter(({ price }) => {
          return price !== null;
        })
        .map(({ price }) => {
          return new Big(price ?? 0);
        })
    ).toNumber();
  }

  protected getType({ createdAt, expiresAt, price }: Subscription) {
    if (price) {
      return $localize`Paid`;
    }

    return differenceInDays(expiresAt, createdAt) <= 90
      ? $localize`Trial`
      : $localize`Coupon`;
  }

  protected onClose() {
    this.dialogRef.close();
  }
}
