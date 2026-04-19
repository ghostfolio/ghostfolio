import { ImpersonationStorageService } from '@ghostfolio/client/services/impersonation-storage.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { locale as defaultLocale } from '@ghostfolio/common/config';
import {
  AssetProfileIdentifier,
  Benchmark,
  User
} from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { GfBenchmarkComponent } from '@ghostfolio/ui/benchmark';
import { GfPremiumIndicatorComponent } from '@ghostfolio/ui/premium-indicator';
import { DataService } from '@ghostfolio/ui/services';

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  DestroyRef,
  inject,
  OnInit
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline } from 'ionicons/icons';
import { DeviceDetectorService } from 'ngx-device-detector';

import { GfCreateWatchlistItemDialogComponent } from './create-watchlist-item-dialog/create-watchlist-item-dialog.component';
import { CreateWatchlistItemDialogParams } from './create-watchlist-item-dialog/interfaces/interfaces';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    GfBenchmarkComponent,
    GfPremiumIndicatorComponent,
    IonIcon,
    MatButtonModule,
    RouterModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'gf-home-watchlist',
  styleUrls: ['./home-watchlist.scss'],
  templateUrl: './home-watchlist.html'
})
export class GfHomeWatchlistComponent implements OnInit {
  protected hasImpersonationId: boolean;
  protected hasPermissionToCreateWatchlistItem: boolean;
  protected hasPermissionToDeleteWatchlistItem: boolean;
  protected user: User;
  protected watchlist: Benchmark[];

  protected readonly deviceType = computed(
    () => this.deviceDetectorService.deviceInfo().deviceType
  );

  private readonly changeDetectorRef = inject(ChangeDetectorRef);
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

  public constructor() {
    this.impersonationStorageService
      .onChangeHasImpersonation()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((impersonationId) => {
        this.hasImpersonationId = !!impersonationId;
      });

    this.route.queryParams
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        if (params['createWatchlistItemDialog']) {
          this.openCreateWatchlistItemDialog();
        }
      });

    this.userService.stateChanged
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => {
        if (state?.user) {
          this.user = state.user;

          this.hasPermissionToCreateWatchlistItem =
            !this.hasImpersonationId &&
            hasPermission(
              this.user.permissions,
              permissions.createWatchlistItem
            );
          this.hasPermissionToDeleteWatchlistItem =
            !this.hasImpersonationId &&
            hasPermission(
              this.user.permissions,
              permissions.deleteWatchlistItem
            );

          this.changeDetectorRef.markForCheck();
        }
      });

    addIcons({ addOutline });
  }

  public ngOnInit() {
    this.loadWatchlistData();
  }

  protected onWatchlistItemDeleted({
    dataSource,
    symbol
  }: AssetProfileIdentifier) {
    this.dataService
      .deleteWatchlistItem({ dataSource, symbol })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          return this.loadWatchlistData();
        }
      });
  }

  private loadWatchlistData() {
    this.dataService
      .fetchWatchlist()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ watchlist }) => {
        this.watchlist = watchlist;

        this.changeDetectorRef.markForCheck();
      });
  }

  private openCreateWatchlistItemDialog() {
    this.userService
      .get()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((user) => {
        this.user = user;

        const dialogRef = this.dialog.open<
          GfCreateWatchlistItemDialogComponent,
          CreateWatchlistItemDialogParams
        >(GfCreateWatchlistItemDialogComponent, {
          autoFocus: false,
          data: {
            deviceType: this.deviceType(),
            locale: this.user?.settings?.locale ?? defaultLocale
          },
          width: this.deviceType() === 'mobile' ? '100vw' : '50rem'
        });

        dialogRef
          .afterClosed()
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe(({ dataSource, symbol } = {}) => {
            if (dataSource && symbol) {
              this.dataService
                .postWatchlistItem({ dataSource, symbol })
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe({
                  next: () => this.loadWatchlistData()
                });
            }

            this.router.navigate(['.'], { relativeTo: this.route });
          });
      });
  }
}
