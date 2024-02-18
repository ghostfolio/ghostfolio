import { DataService } from '@ghostfolio/client/services/data.service';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';

import { Component, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';

@Component({
  host: { class: 'page' },
  selector: 'gf-blog-page',
  styleUrls: ['./blog-page.scss'],
  templateUrl: './blog-page.html'
})
export class BlogPageComponent implements OnDestroy {
  public hasPermissionForSubscription: boolean;

  private unsubscribeSubject = new Subject<void>();

  public constructor(private dataService: DataService) {
    const info = this.dataService.fetchInfo();

    this.hasPermissionForSubscription = hasPermission(
      info?.globalPermissions,
      permissions.enableSubscription
    );
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
