import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { CreateOrderDto } from '@ghostfolio/api/app/order/create-order.dto';
import { UpdateOrderDto } from '@ghostfolio/api/app/order/update-order.dto';
import { DataService } from '@ghostfolio/client/services/data.service';
import { ImpersonationStorageService } from '@ghostfolio/client/services/impersonation-storage.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { User } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { Order as OrderModel } from '@prisma/client';
import { format, parseISO } from 'date-fns';
import { DeviceDetectorService } from 'ngx-device-detector';
import { EMPTY, Subject, Subscription } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';

import { CreateOrUpdateTransactionDialog } from './create-or-update-transaction-dialog/create-or-update-transaction-dialog.component';
import { ImportTransactionDialog } from './import-transaction-dialog/import-transaction-dialog.component';

@Component({
  selector: 'gf-transactions-page',
  templateUrl: './transactions-page.html',
  styleUrls: ['./transactions-page.scss']
})
export class TransactionsPageComponent implements OnDestroy, OnInit {
  public defaultAccountId: string;
  public deviceType: string;
  public hasImpersonationId: boolean;
  public hasPermissionToCreateOrder: boolean;
  public hasPermissionToDeleteOrder: boolean;
  public hasPermissionToImportOrders: boolean;
  public routeQueryParams: Subscription;
  public transactions: OrderModel[];
  public user: User;

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
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar,
    private userService: UserService
  ) {
    this.routeQueryParams = route.queryParams
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((params) => {
        if (params['createDialog']) {
          this.openCreateTransactionDialog();
        } else if (params['editDialog']) {
          if (this.transactions) {
            const transaction = this.transactions.find((transaction) => {
              return transaction.id === params['transactionId'];
            });

            this.openUpdateTransactionDialog(transaction);
          } else {
            this.router.navigate(['.'], { relativeTo: this.route });
          }
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
          this.user = state.user;

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

          this.changeDetectorRef.markForCheck();
        }
      });

    this.fetchOrders();
  }

  public fetchOrders() {
    this.dataService
      .fetchOrders()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((response) => {
        this.transactions = response;

        if (this.transactions?.length <= 0) {
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
    input.type = 'file';

    input.onchange = (event) => {
      // Getting the file reference
      const file = (event.target as HTMLInputElement).files[0];

      // Setting up the reader
      const reader = new FileReader();
      reader.readAsText(file, 'UTF-8');

      reader.onload = (readerEvent) => {
        try {
          const content = JSON.parse(readerEvent.target.result as string);

          this.snackBar.open('⏳ Importing data...');

          this.dataService
            .postImport({
              orders: content.orders.map((order) => {
                return { ...order, accountId: this.defaultAccountId };
              })
            })
            .pipe(
              catchError((error) => {
                this.handleImportError(error);

                return EMPTY;
              }),
              takeUntil(this.unsubscribeSubject)
            )
            .subscribe({
              next: () => {
                this.fetchOrders();

                this.snackBar.open('✅ Import has been completed', undefined, {
                  duration: 3000
                });
              }
            });
        } catch (error) {
          this.handleImportError({ error: { message: ['Unexpected format'] } });
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

  private handleImportError(aError: any) {
    this.snackBar.dismiss();

    this.dialog.open(ImportTransactionDialog, {
      data: {
        deviceType: this.deviceType,
        messages: aError?.error?.message
      },
      width: this.deviceType === 'mobile' ? '100vw' : '50rem'
    });
  }

  private openCreateTransactionDialog(aTransaction?: OrderModel): void {
    const dialogRef = this.dialog.open(CreateOrUpdateTransactionDialog, {
      data: {
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
  }
}
