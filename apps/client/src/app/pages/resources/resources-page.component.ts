import { DataService } from '@ghostfolio/client/services/data.service';
import { InfoItem } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';

import { Component, OnInit } from '@angular/core';
import { Subject } from 'rxjs';

@Component({
  host: { class: 'page' },
  selector: 'gf-resources-page',
  styleUrls: ['./resources-page.scss'],
  templateUrl: './resources-page.html'
})
export class ResourcesPageComponent implements OnInit {
  public hasPermissionForSubscription: boolean;
  public info: InfoItem;
  public routerLinkFaq = ['/' + $localize`faq`];
  public routerLinkResourcesPersonalFinanceTools = [
    '/' + $localize`resources`,
    'personal-finance-tools'
  ];

  private unsubscribeSubject = new Subject<void>();

  public constructor(private dataService: DataService) {
    this.info = this.dataService.fetchInfo();
  }

  public ngOnInit() {
    this.hasPermissionForSubscription = hasPermission(
      this.info?.globalPermissions,
      permissions.enableSubscription
    );
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
