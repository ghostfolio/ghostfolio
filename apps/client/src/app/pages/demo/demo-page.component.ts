import { TokenStorageService } from '@ghostfolio/client/services/token-storage.service';
import { InfoItem } from '@ghostfolio/common/interfaces';
import { NotificationService } from '@ghostfolio/ui/notifications';
import { DataService } from '@ghostfolio/ui/services';

import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  host: { class: 'page' },
  selector: 'gf-demo-page',
  standalone: true,
  templateUrl: './demo-page.html'
})
export class GfDemoPageComponent {
  public info: InfoItem;

  public constructor(
    private dataService: DataService,
    private notificationService: NotificationService,
    private router: Router,
    private tokenStorageService: TokenStorageService
  ) {
    this.info = this.dataService.fetchInfo();
  }

  public ngOnInit() {
    const hasToken = this.tokenStorageService.getToken()?.length > 0;

    if (hasToken) {
      this.notificationService.alert({
        title: $localize`As you are already logged in, you cannot access the demo account.`
      });
    } else {
      this.tokenStorageService.saveToken(this.info.demoAuthToken, true);
    }

    this.router.navigate(['/']);
  }
}
