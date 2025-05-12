import { paths } from '@ghostfolio/client/core/paths';
import { DataService } from '@ghostfolio/client/services/data.service';
import { InfoItem } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';

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
    '/' + paths.resources,
    paths.personalFinanceTools
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
