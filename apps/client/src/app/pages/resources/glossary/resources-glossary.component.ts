import { InfoItem } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { publicRoutes } from '@ghostfolio/common/routes/routes';
import { DataService } from '@ghostfolio/ui/services';

import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  imports: [RouterModule],
  selector: 'gf-resources-glossary',
  styleUrls: ['./resources-glossary.component.scss'],
  templateUrl: './resources-glossary.component.html'
})
export class ResourcesGlossaryPageComponent implements OnInit {
  public hasPermissionForSubscription: boolean;
  public info: InfoItem;
  public routerLinkResourcesPersonalFinanceTools =
    publicRoutes.resources.subRoutes.personalFinanceTools.routerLink;

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
