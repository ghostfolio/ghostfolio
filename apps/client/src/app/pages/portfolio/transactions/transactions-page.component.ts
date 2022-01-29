import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { CreateOrderDto } from '@ghostfolio/api/app/order/create-order.dto';
import { Activity } from '@ghostfolio/api/app/order/interfaces/activities.interface';
import { UpdateOrderDto } from '@ghostfolio/api/app/order/update-order.dto';
import { PositionDetailDialog } from '@ghostfolio/client/components/position/position-detail-dialog/position-detail-dialog.component';
import { DataService } from '@ghostfolio/client/services/data.service';
import { ImpersonationStorageService } from '@ghostfolio/client/services/impersonation-storage.service';
import { ImportTransactionsService } from '@ghostfolio/client/services/import-transactions.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { User } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { DataSource, Order as OrderModel } from '@prisma/client';
import { format, parseISO } from 'date-fns';
import { isArray } from 'lodash';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Subject, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { CreateOrUpdateTransactionDialog } from './create-or-update-transaction-dialog/create-or-update-transaction-dialog.component';
import { ImportTransactionDialog } from './import-transaction-dialog/import-transaction-dialog.component';

@Component({
  host: { class: 'mb-5' },
  selector: 'gf-transactions-page',
  styleUrls: ['./transactions-page.scss'],
  templateUrl: './transactions-page.html'
})
export class TransactionsPageComponent implements OnDestroy, OnInit {
  public activities: Activity[];
  public defaultAccountId: string;
  public deviceType: string;
  public hasImpersonationId: boolean;
  public hasPermissionToCreateOrder: boolean;
  public hasPermissionToDeleteOrder: boolean;
  public hasPermissionToImportOrders: boolean;
  public routeQueryParams: Subscription;
  public user: User;

  private primaryDataSource: DataSource;
  private unsubscribeSubject = new Subject<void>();

  /**
   * @constructor
   */
  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private deviceService: DeviceDetectorService,
    private dialog: MatDialog,
    private impersonationStorageService: ImpersonationStorageService,
    private importTransactionsService: ImportTransactionsService,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar,
    private userService: UserService
  ) {
    const { primaryDataSource } = this.dataService.fetchInfo();
    this.primaryDataSource = primaryDataSource;

    this.routeQueryParams = route.queryParams
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((params) => {
        if (params['createDialog']) {
          this.openCreateTransactionDialog();
        } else if (params['editDialog']) {
          if (this.activities) {
            const transaction = this.activities.find(({ id }) => {
              return id === params['transactionId'];
            });

            this.openUpdateTransactionDialog(transaction);
          } else {
            this.router.navigate(['.'], { relativeTo: this.route });
          }
        } else if (
          params['dataSource'] &&
          params['positionDetailDialog'] &&
          params['symbol']
        ) {
          this.openPositionDialog({
            dataSource: params['dataSource'],
            symbol: params['symbol']
          });
        }
      });
  }

  /**
   * Initializes the controller
   */
  public ngOnInit() {
    const { globalPermissions } = this.dataService.fetchInfo();

    this.hasPermissionToImportOrders = hasPermission(
      globalPermissions,
      permissions.enableImport
    );

    this.deviceType = this.deviceService.getDeviceInfo().deviceType;

    this.impersonationStorageService
      .onChangeHasImpersonation()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((aId) => {
        this.hasImpersonationId = !!aId;
      });

    this.userService.stateChanged
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((state) => {
        if (state?.user) {
          this.updateUser(state.user);

          this.changeDetectorRef.markForCheck();
        }
      });

    this.fetchOrders();
  }

  public fetchOrders() {
    this.dataService
      .fetchOrders()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(({ activities }) => {
        this.activities = activities;

        if (this.hasPermissionToCreateOrder && this.activities?.length <= 0) {
          this.router.navigate([], { queryParams: { createDialog: true } });
        }

        this.changeDetectorRef.markForCheck();
      });
  }

  public onCloneTransaction(aTransaction: OrderModel) {
    this.openCreateTransactionDialog(aTransaction);
  }

  public onDeleteTransaction(aId: string) {
    this.dataService
      .deleteOrder(aId)
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe({
        next: () => {
          this.fetchOrders();
        }
      });
  }

  public onExport() {
    this.dataService
      .fetchExport()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((data) => {
        this.downloadAsFile(
          data,
          `ghostfolio-export-${format(
            parseISO(data.meta.date),
            'yyyyMMddHHmm'
          )}.json`,
          'text/plain'
        );
      });
  }

  public onImport() {
    const input = document.createElement('input');
    input.accept = 'application/JSON, .csv';
    input.type = 'file';

    input.onchange = (event) => {
      this.snackBar.open('⏳ Importing data...');

      // Getting the file reference
      const file = (event.target as HTMLInputElement).files[0];

      // Setting up the reader
      const reader = new FileReader();
      reader.readAsText(file, 'UTF-8');

      reader.onload = async (readerEvent) => {
        const fileContent = readerEvent.target.result as string;

        try {
          if (file.name.endsWith('.json')) {
            const content = JSON.parse(fileContent);

            if (!isArray(content.orders)) {
              throw new Error();
            }

            try {
              await this.importTransactionsService.importJson({
                content: content.orders,
                defaultAccountId: this.defaultAccountId
              });

              this.handleImportSuccess();
            } catch (error) {
              console.error(error);
              this.handleImportError({ error, orders: content.orders });
            }

            return;
          } else if (file.name.endsWith('.csv')) {
            try {
              await this.importTransactionsService.importCsv({
                fileContent,
                defaultAccountId: this.defaultAccountId,
                primaryDataSource: this.primaryDataSource
              });

              this.handleImportSuccess();
            } catch (error) {
              console.error(error);
              this.handleImportError({
                error: {
                  error: { message: error?.error?.message ?? [error?.message] }
                },
                orders: error?.orders ?? []
              });
            }

            return;
          }

          throw new Error();
        } catch (error) {
          console.error(error);
          this.handleImportError({
            error: { error: { message: ['Unexpected format'] } },
            orders: []
          });
        }
      };
    };

    input.click();
  }

  public onUpdateTransaction(aTransaction: OrderModel) {
    this.router.navigate([], {
      queryParams: { editDialog: true, transactionId: aTransaction.id }
    });
  }

  public openUpdateTransactionDialog({
    accountId,
    currency,
    dataSource,
    date,
    fee,
    id,
    quantity,
    symbol,
    type,
    unitPrice
  }: OrderModel): void {
    const dialogRef = this.dialog.open(CreateOrUpdateTransactionDialog, {
      data: {
        accounts: this.user?.accounts?.filter((account) => {
          return account.accountType === 'SECURITIES';
        }),
        transaction: {
          accountId,
          currency,
          dataSource,
          date,
          fee,
          id,
          quantity,
          symbol,
          type,
          unitPrice
        },
        user: this.user
      },
      height: this.deviceType === 'mobile' ? '97.5vh' : '80vh',
      width: this.deviceType === 'mobile' ? '100vw' : '50rem'
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((data: any) => {
        const transaction: UpdateOrderDto = data?.transaction;

        if (transaction) {
          this.dataService
            .putOrder(transaction)
            .pipe(takeUntil(this.unsubscribeSubject))
            .subscribe({
              next: () => {
                this.fetchOrders();
              }
            });
        }

        this.router.navigate(['.'], { relativeTo: this.route });
      });
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  private downloadAsFile(
    aContent: unknown,
    aFileName: string,
    aContentType: string
  ) {
    const a = document.createElement('a');
    const file = new Blob([JSON.stringify(aContent, undefined, '  ')], {
      type: aContentType
    });
    a.href = URL.createObjectURL(file);
    a.download = aFileName;
    a.click();
  }

  private handleImportError({ error, orders }: { error: any; orders: any[] }) {
    this.snackBar.dismiss();

    this.dialog.open(ImportTransactionDialog, {
      data: {
        orders,
        deviceType: this.deviceType,
        messages: error?.error?.message
      },
      width: this.deviceType === 'mobile' ? '100vw' : '50rem'
    });
  }

  private handleImportSuccess() {
    this.fetchOrders();

    this.snackBar.open('✅ Import has been completed', undefined, {
      duration: 3000
    });
  }

  private openCreateTransactionDialog(aTransaction?: OrderModel): void {
    this.userService
      .get()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((user) => {
        this.updateUser(user);

        const dialogRef = this.dialog.open(CreateOrUpdateTransactionDialog, {
          data: {
            accounts: this.user?.accounts?.filter((account) => {
              return account.accountType === 'SECURITIES';
            }),
            transaction: {
              accountId: aTransaction?.accountId ?? this.defaultAccountId,
              currency: aTransaction?.currency ?? null,
              dataSource: aTransaction?.dataSource ?? null,
              date: new Date(),
              fee: 0,
              quantity: null,
              symbol: aTransaction?.symbol ?? null,
              type: aTransaction?.type ?? 'BUY',
              unitPrice: null
            },
            user: this.user
          },
          height: this.deviceType === 'mobile' ? '97.5vh' : '80vh',
          width: this.deviceType === 'mobile' ? '100vw' : '50rem'
        });

        dialogRef
          .afterClosed()
          .pipe(takeUntil(this.unsubscribeSubject))
          .subscribe((data: any) => {
            const transaction: CreateOrderDto = data?.transaction;

            if (transaction) {
              this.dataService.postOrder(transaction).subscribe({
                next: () => {
                  this.fetchOrders();
                }
              });
            }

            this.router.navigate(['.'], { relativeTo: this.route });
          });
      });
  }

  private openPositionDialog({
    dataSource,
    symbol
  }: {
    dataSource: DataSource;
    symbol: string;
  }) {
    this.userService
      .get()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((user) => {
        this.updateUser(user);

        const dialogRef = this.dialog.open(PositionDetailDialog, {
          autoFocus: false,
          data: {
            dataSource,
            symbol,
            baseCurrency: this.user?.settings?.baseCurrency,
            deviceType: this.deviceType,
            locale: this.user?.settings?.locale
          },
          height: this.deviceType === 'mobile' ? '97.5vh' : '80vh',
          width: this.deviceType === 'mobile' ? '100vw' : '50rem'
        });

        dialogRef
          .afterClosed()
          .pipe(takeUntil(this.unsubscribeSubject))
          .subscribe(() => {
            this.router.navigate(['.'], { relativeTo: this.route });
          });
      });
  }

  private updateUser(aUser: User) {
    this.user = aUser;

    this.defaultAccountId = this.user?.accounts.find((account) => {
      return account.isDefault;
    })?.id;

    this.hasPermissionToCreateOrder = hasPermission(
      this.user.permissions,
      permissions.createOrder
    );
    this.hasPermissionToDeleteOrder = hasPermission(
      this.user.permissions,
      permissions.deleteOrder
    );
  }
}
