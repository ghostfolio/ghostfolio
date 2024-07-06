import { AdminService } from '@ghostfolio/client/services/admin.service';
import { UniqueAsset } from '@ghostfolio/common/interfaces';

import { Injectable } from '@angular/core';
import { EMPTY, catchError, finalize, forkJoin, takeUntil } from 'rxjs';

@Injectable()
export class AdminMarketDataService {
  public constructor(private adminService: AdminService) {}

  public deleteAssetProfile({ dataSource, symbol }: UniqueAsset) {
    const confirmation = confirm(
      $localize`Do you really want to delete this asset profile?`
    );

    if (confirmation) {
      this.adminService
        .deleteProfileData({ dataSource, symbol })
        .subscribe(() => {
          setTimeout(() => {
            window.location.reload();
          }, 300);
        });
    }
  }

  public deleteAssetProfiles(uniqueAssets: UniqueAsset[]) {
    const confirmation = confirm(
      $localize`Do you really want to delete these asset profiles?`
    );

    if (confirmation) {
      const deleteRequests = uniqueAssets.map(({ dataSource, symbol }) => {
        return this.adminService.deleteProfileData({ dataSource, symbol });
      });

      forkJoin(deleteRequests)
        .pipe(
          catchError(() => {
            alert($localize`Oops! Could not delete asset profiles.`);

            return EMPTY;
          }),
          finalize(() => {
            setTimeout(() => {
              window.location.reload();
            }, 300);
          })
        )
        .subscribe(() => {});
    }
  }
}
