import { DataService } from '@ghostfolio/client/services/data.service';
import { InfoItem } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { routes } from '@ghostfolio/common/routes/routes';

import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'gf-resources-glossary',
  styleUrls: ['./resources-glossary.component.scss'],
  templateUrl: './resources-glossary.component.html',
  standalone: false
})
export class ResourcesGlossaryPageComponent implements OnInit {
  public hasPermissionForSubscription: boolean;
  public info: InfoItem;
  public routerLinkResourcesPersonalFinanceTools = [
    '/' + routes.resources,
    routes.personalFinanceTools
  ];

  public constructor(private dataService: DataService) {
    this.info = this.dataService.fetchInfo();
  }

  public ngOnInit() {
    this.hasPermissionForSubscription = hasPermission(
      this.info?.globalPermissions,
      permissions.enableSubscription
    );
  }
}
