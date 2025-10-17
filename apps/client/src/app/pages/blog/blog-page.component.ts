import { DataService } from '@ghostfolio/client/services/data.service';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';

import { CommonModule } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA, OnDestroy } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { RouterModule } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronForwardOutline } from 'ionicons/icons';
import { Subject } from 'rxjs';

@Component({
  host: { class: 'page' },
  imports: [CommonModule, IonIcon, MatCardModule, RouterModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'gf-blog-page',
  styleUrls: ['./blog-page.scss'],
  templateUrl: './blog-page.html'
})
export class GfBlogPageComponent implements OnDestroy {
  public hasPermissionForSubscription: boolean;

  private unsubscribeSubject = new Subject<void>();

  public constructor(private dataService: DataService) {
    const info = this.dataService.fetchInfo();

    this.hasPermissionForSubscription = hasPermission(
      info?.globalPermissions,
      permissions.enableSubscription
    );

    addIcons({ chevronForwardOutline });
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
