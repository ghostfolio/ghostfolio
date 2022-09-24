import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { DataService } from '@ghostfolio/client/services/data.service';
import { ImpersonationStorageService } from '@ghostfolio/client/services/impersonation-storage.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { Filter, PortfolioSummary, User } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { AssetClass } from '@prisma/client';
import { Subject } from 'rxjs';
import { distinctUntilChanged, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'gf-home-summary',
  styleUrls: ['./home-summary.scss'],
  templateUrl: './home-summary.html'
})
export class HomeSummaryComponent implements OnDestroy, OnInit {
  public activeFilters: Filter[] = [];
  public allFilters: Filter[];
  public filterPlaceholder = '';
  public filters$ = new Subject<Filter[]>();
  public hasImpersonationId: boolean;
  public hasPermissionToUpdateUserSettings: boolean;
  public isLoading = true;
  public summary: PortfolioSummary;
  public user: User;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private impersonationStorageService: ImpersonationStorageService,
    private userService: UserService
  ) {
    this.userService.stateChanged
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((state) => {
        if (state?.user) {
          this.user = state.user;

          this.hasPermissionToUpdateUserSettings = hasPermission(
            this.user.permissions,
            permissions.updateUserSettings
          );

          const accountFilters: Filter[] = this.user.accounts
            .filter(({ accountType }) => {
              return accountType === 'SECURITIES';
            })
            .map(({ id, name }) => {
              return {
                id,
                label: name,
                type: 'ACCOUNT'
              };
            });
          const assetClassFilters: Filter[] = [];
          for (const assetClass of Object.keys(AssetClass)) {
            assetClassFilters.push({
              id: assetClass,
              label: assetClass,
              type: 'ASSET_CLASS'
            });
          }
          const tagFilters: Filter[] = this.user.tags.map(({ id, name }) => {
            return {
              id,
              label: name,
              type: 'TAG'
            };
          });

          this.allFilters = [
            ...accountFilters,
            ...assetClassFilters,
            ...tagFilters
          ];

          this.update();
        }
      });
  }

  public ngOnInit() {
    this.impersonationStorageService
      .onChangeHasImpersonation()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((aId) => {
        this.hasImpersonationId = !!aId;
      });

    this.filters$
      .pipe(distinctUntilChanged(), takeUntil(this.unsubscribeSubject))
      .subscribe((filters) => {
        this.activeFilters = filters;
        this.filterPlaceholder =
          this.activeFilters.length <= 0
            ? $localize`Filter by account or tag...`
            : '';
        this.update();
        this.changeDetectorRef.markForCheck();
      });

    this.update();
  }

  public onChangeEmergencyFund(emergencyFund: number) {
    this.dataService
      .putUserSetting({ emergencyFund })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(() => {
        this.userService.remove();

        this.userService
          .get()
          .pipe(takeUntil(this.unsubscribeSubject))
          .subscribe((user) => {
            this.user = user;

            this.changeDetectorRef.markForCheck();
          });
      });
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  private update() {
    this.isLoading = true;

    this.dataService
      .fetchPortfolioSummary(this.activeFilters)
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((response) => {
        this.summary = response;
        this.isLoading = false;

        this.changeDetectorRef.markForCheck();
      });

    this.changeDetectorRef.markForCheck();
  }
}
