import { UserService } from '@ghostfolio/client/services/user/user.service';
import {
  DEFAULT_COLOR_SCHEME,
  DEFAULT_LOCALE
} from '@ghostfolio/common/config';
import { AssetProfileIdentifier, User } from '@ghostfolio/common/interfaces';
import { internalRoutes } from '@ghostfolio/common/routes/routes';
import { AdminService } from '@ghostfolio/ui/services';

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnDestroy,
  OnInit
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { DataSource } from '@prisma/client';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Subject } from 'rxjs';
import { distinctUntilChanged, map, takeUntil, tap } from 'rxjs/operators';

import { AdminMarketDataService } from '../admin-market-data.service';
import { GfAssetProfileDialogComponent } from '../asset-profile-dialog/asset-profile-dialog.component';
import { AssetProfileDialogParams } from '../asset-profile-dialog/interfaces/interfaces';
import { GfCreateAssetProfileDialogComponent } from '../create-asset-profile-dialog/create-asset-profile-dialog.component';
import { CreateAssetProfileDialogParams } from '../create-asset-profile-dialog/interfaces/interfaces';
import { AssetProfileDialogMode } from './types/asset-profile-dialog-mode.type';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'gf-asset-profile-dialog-host',
  template: ''
})
export class GfAssetProfileDialogHostComponent implements OnDestroy, OnInit {
  private dialogRef: MatDialogRef<
    GfAssetProfileDialogComponent | GfCreateAssetProfileDialogComponent
  >;

  private readonly deviceType = computed(() => {
    return this.deviceDetectorService.deviceInfo().deviceType;
  });

  private readonly dialogClosed = new Subject<void>();

  private readonly adminMarketDataService = inject(AdminMarketDataService);
  private readonly adminService = inject(AdminService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly deviceDetectorService = inject(DeviceDetectorService);
  private readonly dialog = inject(MatDialog);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly userService = inject(UserService);

  public ngOnInit() {
    const mode = this.route.snapshot.data.mode as AssetProfileDialogMode;

    // The router reuses this component when only the asset profile identifier
    // changes, so the parameters are observed instead of read from the
    // snapshot once
    this.route.paramMap
      .pipe(
        map((paramMap) => {
          return {
            dataSource: paramMap.get('dataSource'),
            symbol: paramMap.get('symbol')
          };
        }),
        distinctUntilChanged((previous, current) => {
          return (
            previous.dataSource === current.dataSource &&
            previous.symbol === current.symbol
          );
        }),
        tap(() => {
          this.closeDialog();
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(({ dataSource, symbol }) => {
        this.userService
          .get()
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe((user) => {
            if (mode === 'create') {
              this.openCreateAssetProfileDialog({ user });
            } else if (dataSource && symbol) {
              this.openAssetProfileDialog({
                dataSource: dataSource as DataSource,
                symbol,
                user
              });
            } else {
              this.navigateBack();
            }
          });
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
    void this.router.navigate(
      internalRoutes.adminControl.subRoutes.marketData.routerLink
    );
  }

  private navigateToAssetProfileDialog({
    dataSource,
    symbol
  }: AssetProfileIdentifier) {
    void this.router.navigate(
      internalRoutes.adminControl.subRoutes.marketData.subRoutes.update.routerLink(
        dataSource,
        symbol
      )
    );
  }

  private openAssetProfileDialog({
    dataSource,
    symbol,
    user
  }: AssetProfileIdentifier & { user: User }) {
    const dialogRef = this.dialog.open<
      GfAssetProfileDialogComponent,
      AssetProfileDialogParams,
      AssetProfileIdentifier
    >(GfAssetProfileDialogComponent, {
      autoFocus: false,
      data: {
        dataSource,
        symbol,
        colorScheme: user?.settings.colorScheme ?? DEFAULT_COLOR_SCHEME,
        deviceType: this.deviceType(),
        locale: user?.settings?.locale ?? DEFAULT_LOCALE
      } satisfies AssetProfileDialogParams,
      height: this.deviceType() === 'mobile' ? '98vh' : '80vh',
      width: this.deviceType() === 'mobile' ? '100vw' : '50rem'
    });

    this.dialogRef = dialogRef;

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this.dialogClosed), takeUntilDestroyed(this.destroyRef))
      .subscribe((newAssetProfileIdentifier) => {
        this.adminMarketDataService.triggerRefresh();

        if (newAssetProfileIdentifier) {
          this.navigateToAssetProfileDialog(newAssetProfileIdentifier);
        } else {
          this.navigateBack();
        }
      });
  }

  private openCreateAssetProfileDialog({ user }: { user: User }) {
    const dialogRef = this.dialog.open<
      GfCreateAssetProfileDialogComponent,
      CreateAssetProfileDialogParams,
      AssetProfileIdentifier & { addAssetProfile: boolean }
    >(GfCreateAssetProfileDialogComponent, {
      autoFocus: false,
      data: {
        deviceType: this.deviceType(),
        locale: user?.settings?.locale ?? DEFAULT_LOCALE
      } satisfies CreateAssetProfileDialogParams,
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

        const { addAssetProfile, dataSource, symbol } = result;

        if (addAssetProfile && dataSource && symbol) {
          this.adminService
            .addAssetProfile({ dataSource, symbol })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
              this.navigateToAssetProfileDialog({ dataSource, symbol });
            });
        } else {
          this.navigateToAssetProfileDialog({ dataSource, symbol });
        }
      });
  }
}
