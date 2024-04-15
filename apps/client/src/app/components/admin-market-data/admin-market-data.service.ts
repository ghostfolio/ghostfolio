import { AdminService } from '@ghostfolio/client/services/admin.service';
import { UniqueAsset } from '@ghostfolio/common/interfaces';

import { Injectable } from '@angular/core';
import { takeUntil } from 'rxjs';

@Injectable()
export class AdminMarketDataService {
  public constructor(private adminService: AdminService) {}

  public deleteProfileData({ dataSource, symbol }: UniqueAsset) {
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
}
