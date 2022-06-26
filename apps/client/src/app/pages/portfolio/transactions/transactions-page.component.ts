import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { CreateOrderDto } from '@ghostfolio/api/app/order/create-order.dto';
import { Activity } from '@ghostfolio/api/app/order/interfaces/activities.interface';
import { UpdateOrderDto } from '@ghostfolio/api/app/order/update-order.dto';
import { PositionDetailDialogParams } from '@ghostfolio/client/components/position/position-detail-dialog/interfaces/interfaces';
import { PositionDetailDialog } from '@ghostfolio/client/components/position/position-detail-dialog/position-detail-dialog.component';
import { DataService } from '@ghostfolio/client/services/data.service';
import { IcsService } from '@ghostfolio/client/services/ics/ics.service';
import { ImpersonationStorageService } from '@ghostfolio/client/services/impersonation-storage.service';
import { ImportTransactionsService } from '@ghostfolio/client/services/import-transactions.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { downloadAsFile } from '@ghostfolio/common/helper';
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
  host: { class: 'page' },
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

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private deviceService: DeviceDetectorService,
    private dialog: MatDialog,
    private icsService: IcsService,
    private impersonationStorageService: ImpersonationStorageService,
    private importTransactionsService: ImportTransactionsService,
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

  public ngOnInit() {
    const { globalPermissions } = this.dataService.fetchInfo();

    this.deviceType = this.deviceService.getDeviceInfo().deviceType;

    this.impersonationStorageService
      .onChangeHasImpersonation()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((aId) => {
        this.hasImpersonationId = !!aId;

        this.hasPermissionToImportOrders =
          hasPermission(globalPermissions, permissions.enableImport) &&
          !this.hasImpersonationId;
      });

    this.userService.stateChanged
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((state) => {
        if (state?.user) {
          this.updateUser(state.user);

          this.changeDetectorRef.markForCheck();
        }
      });

    this.fetchActivities();
  }

  public fetchActivities() {
    this.dataService
      .fetchActivities({})
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(({ activities }) => {
        this.activities = activities;

        if (this.hasPermissionToCreateOrder && this.activities?.length <= 0) {
          this.router.navigate([], { queryParams: { createDialog: true } });
        }

        this.changeDetectorRef.markForCheck();
      });
  }

  public onCloneTransaction(aActivity: Activity) {
    this.openCreateTransactionDialog(aActivity);
  }

  public onDeleteTransaction(aId: string) {
    this.dataService
      .deleteOrder(aId)
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe({
        next: () => {
          this.fetchActivities();
        }
      });
  }

  public onExport(activityIds?: string[]) {
    this.dataService
      .fetchExport(activityIds)
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((data) => {
        for (const activity of data.activities) {
          delete activity.id;
        }

        downloadAsFile({
          content: data,
          fileName: `ghostfolio-export-${format(
            parseISO(data.meta.date),
            'yyyyMMddHHmm'
          )}.json`,
          format: 'json'
        });
      });
  }

  public onExportDrafts(activityIds?: string[]) {
    this.dataService
      .fetchExport(activityIds)
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((data) => {
        downloadAsFile({
          content: this.icsService.transformActivitiesToIcsContent(
            data.activities
          ),
          contentType: 'text/calendar',
          fileName: `ghostfolio-draft${
            data.activities.length > 1 ? 's' : ''
          }-${format(parseISO(data.meta.date), 'yyyyMMddHHmmss')}.ics`,
          format: 'string'
        });
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

            if (!isArray(content.activities)) {
              if (isArray(content.orders)) {
                this.handleImportError({
                  activities: [],
                  error: {
                    error: {
                      message: [`orders needs to be renamed to activities`]
                    }
                  }
                });
                return;
              } else {
                throw new Error();
              }
            }

            try {
              await this.importTransactionsService.importJson({
                content: content.activities
              });

              this.handleImportSuccess();
            } catch (error) {
              console.error(error);
              this.handleImportError({ error, activities: content.activities });
            }

            return;
          } else if (file.name.endsWith('.csv')) {
            try {
              await this.importTransactionsService.importCsv({
                fileContent,
                userAccounts: this.user.accounts
              });

              this.handleImportSuccess();
            } catch (error) {
              console.error(error);
              this.handleImportError({
                activities: error?.activities ?? [],
                error: {
                  error: { message: error?.error?.message ?? [error?.message] }
                }
              });
            }

            return;
          }

          throw new Error();
        } catch (error) {
          console.error(error);
          this.handleImportError({
            activities: [],
            error: { error: { message: ['Unexpected format'] } }
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

  public openUpdateTransactionDialog(activity: Activity): void {
    const dialogRef = this.dialog.open(CreateOrUpdateTransactionDialog, {
      data: {
        activity,
        accounts: this.user?.accounts?.filter((account) => {
          return account.accountType === 'SECURITIES';
        }),
        user: this.user
      },
      height: this.deviceType === 'mobile' ? '97.5vh' : '80vh',
      width: this.deviceType === 'mobile' ? '100vw' : '50rem'
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((data: any) => {
        const transaction: UpdateOrderDto = data?.activity;

        if (transaction) {
          this.dataService
            .putOrder(transaction)
            .pipe(takeUntil(this.unsubscribeSubject))
            .subscribe({
              next: () => {
                this.fetchActivities();
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

  private handleImportError({
    activities,
    error
  }: {
    activities: any[];
    error: any;
  }) {
    this.snackBar.dismiss();

    this.dialog.open(ImportTransactionDialog, {
      data: {
        activities,
        deviceType: this.deviceType,
        messages: error?.error?.message
      },
      width: this.deviceType === 'mobile' ? '100vw' : '50rem'
    });
  }

  private handleImportSuccess() {
    this.fetchActivities();

    this.snackBar.open('✅ Import has been completed', undefined, {
      duration: 3000
    });
  }

  private openCreateTransactionDialog(aActivity?: Activity): void {
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
            activity: {
              ...aActivity,
              accountId: aActivity?.accountId ?? this.defaultAccountId,
              date: new Date(),
              id: null,
              fee: 0,
              quantity: null,
              type: aActivity?.type ?? 'BUY',
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
            const transaction: CreateOrderDto = data?.activity;

            if (transaction) {
              this.dataService.postOrder(transaction).subscribe({
                next: () => {
                  this.fetchActivities();
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
          data: <PositionDetailDialogParams>{
            dataSource,
            symbol,
            baseCurrency: this.user?.settings?.baseCurrency,
            deviceType: this.deviceType,
            hasImpersonationId: this.hasImpersonationId,
            hasPermissionToReportDataGlitch: hasPermission(
              this.user?.permissions,
              permissions.reportDataGlitch
            ),
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
