import { GfAccountDetailDialogComponent } from '@ghostfolio/client/components/account-detail-dialog/account-detail-dialog.component';
import {
  AccountDetailDialogParams,
  AccountDetailDialogResult
} from '@ghostfolio/client/components/account-detail-dialog/interfaces/interfaces';
import { ImpersonationStorageService } from '@ghostfolio/client/services/impersonation-storage.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { CreateAccountDto, UpdateAccountDto } from '@ghostfolio/common/dtos';
import { AccountResponse, User } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { internalRoutes } from '@ghostfolio/common/routes/routes';
import { DataService } from '@ghostfolio/ui/services';

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  OnDestroy,
  OnInit,
  inject
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Observable, of, Subject } from 'rxjs';
import {
  distinctUntilChanged,
  map,
  switchMap,
  takeUntil,
  tap
} from 'rxjs/operators';

import { GfCreateOrUpdateAccountDialogComponent } from '../create-or-update-account-dialog/create-or-update-account-dialog.component';
import { CreateOrUpdateAccountDialogParams } from '../create-or-update-account-dialog/interfaces/interfaces';
import { AccountDialogMode } from './types/account-dialog-mode.type';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'gf-account-dialog-host',
  template: ''
})
export class GfAccountDialogHostComponent implements OnDestroy, OnInit {
  private dialogRef: MatDialogRef<
    GfAccountDetailDialogComponent | GfCreateOrUpdateAccountDialogComponent
  >;

  private readonly deviceType = computed(() => {
    return this.deviceDetectorService.deviceInfo().deviceType;
  });

  private readonly dialogClosed = new Subject<void>();

  private readonly dataService = inject(DataService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly deviceDetectorService = inject(DeviceDetectorService);
  private readonly dialog = inject(MatDialog);
  private readonly impersonationStorageService = inject(
    ImpersonationStorageService
  );
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly userService = inject(UserService);

  public ngOnInit() {
    const mode = this.route.snapshot.data.mode as AccountDialogMode;

    // The router reuses this component when only the account id changes, so
    // the parameters are observed instead of read from the snapshot once
    this.route.paramMap
      .pipe(
        map((paramMap) => {
          return paramMap.get('accountId');
        }),
        distinctUntilChanged(),
        tap(() => {
          this.closeDialog();
        }),
        switchMap((accountId) => {
          const account$: Observable<AccountResponse | undefined> =
            mode === 'update' && accountId
              ? this.dataService.fetchAccount(accountId)
              : of(undefined);

          return this.userService.get().pipe(
            switchMap((user) => {
              return account$.pipe(
                map((account) => {
                  return { account, accountId, user };
                })
              );
            })
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        error: () => {
          this.navigateBack();
        },
        next: ({ account, accountId, user }) => {
          if (mode === 'detail') {
            this.openAccountDetailDialog({ accountId, user });

            return;
          }

          if (mode === 'update') {
            if (
              !account ||
              !hasPermission(user?.permissions, permissions.updateAccount)
            ) {
              this.navigateBack();

              return;
            }

            const {
              balance,
              comment,
              currency,
              id,
              isExcluded,
              name,
              platformId,
              tags
            } = account;

            this.openCreateOrUpdateAccountDialog({
              user,
              account: {
                balance,
                comment,
                currency,
                id,
                isExcluded,
                name,
                platformId,
                tags
              },
              isUpdate: true
            });

            return;
          }

          if (!hasPermission(user?.permissions, permissions.createAccount)) {
            this.navigateBack();

            return;
          }

          this.openCreateOrUpdateAccountDialog({
            user,
            account: {
              balance: 0,
              comment: null,
              currency: user?.settings?.baseCurrency ?? null,
              id: null,
              isExcluded: false,
              name: null,
              platformId: null,
              tags: []
            },
            isUpdate: false
          });
        }
      });
  }

  public ngOnDestroy() {
    // The dialog lives in an overlay outside of this component, so it needs to
    // be closed explicitly when leaving the route (for example via the browser
    // navigation)
    this.dialogRef?.close();

    this.dialogClosed.complete();
  }

  private closeDialog() {
    // Tear down the subscription of the dialog which is about to be replaced,
    // so that its result is not mistaken for the user closing it
    this.dialogClosed.next();

    this.dialogRef?.close();
  }

  private navigateBack() {
    void this.router.navigate(internalRoutes.accounts.routerLink);
  }

  private openAccountDetailDialog({
    accountId,
    user
  }: {
    accountId: string | null;
    user: User;
  }) {
    if (!accountId) {
      this.navigateBack();

      return;
    }

    const hasImpersonationId = !!this.impersonationStorageService.getId();

    const dialogRef = this.dialog.open<
      GfAccountDetailDialogComponent,
      AccountDetailDialogParams,
      AccountDetailDialogResult
    >(GfAccountDetailDialogComponent, {
      autoFocus: false,
      data: {
        accountId,
        hasImpersonationId,
        deviceType: this.deviceType(),
        hasPermissionToCreateActivity:
          !hasImpersonationId &&
          hasPermission(user?.permissions, permissions.createActivity) &&
          !user?.settings?.isRestrictedView
      },
      height: this.deviceType() === 'mobile' ? '98vh' : '80vh',
      width: this.deviceType() === 'mobile' ? '100vw' : '50rem'
    });

    this.dialogRef = dialogRef;

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this.dialogClosed), takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (result?.isNavigating) {
          return;
        }

        this.navigateBack();
      });
  }

  private openCreateOrUpdateAccountDialog({
    account,
    isUpdate,
    user
  }: {
    account: CreateOrUpdateAccountDialogParams['account'];
    isUpdate: boolean;
    user: User;
  }) {
    const dialogRef = this.dialog.open<
      GfCreateOrUpdateAccountDialogComponent,
      CreateOrUpdateAccountDialogParams,
      CreateAccountDto | UpdateAccountDto | null
    >(GfCreateOrUpdateAccountDialogComponent, {
      data: {
        account,
        user
      },
      height: this.deviceType() === 'mobile' ? '98vh' : '80vh',
      width: this.deviceType() === 'mobile' ? '100vw' : '50rem'
    });

    this.dialogRef = dialogRef;

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this.dialogClosed), takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (!result) {
          this.navigateBack();

          return;
        }

        const request$: Observable<unknown> = isUpdate
          ? this.dataService.putAccount(result as UpdateAccountDto)
          : this.dataService.postAccount(result as CreateAccountDto);

        request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
          error: () => {
            this.navigateBack();
          },
          next: () => {
            // Deliberately not bound to the destroy reference: navigating back
            // destroys this component and the refreshed user is what makes the
            // accounts page reload its data
            this.userService.get(true).subscribe();

            this.navigateBack();
          }
        });
      });
  }
}
