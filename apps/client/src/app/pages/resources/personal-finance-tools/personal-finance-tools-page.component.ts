import { personalFinanceTools } from '@ghostfolio/common/personal-finance-tools';
import { publicRoutes } from '@ghostfolio/common/routes/routes';

import { Component, OnDestroy } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { RouterModule } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronForwardOutline } from 'ionicons/icons';
import { Subject } from 'rxjs';

@Component({
  host: { class: 'page' },
  imports: [IonIcon, MatCardModule, RouterModule],
  selector: 'gf-personal-finance-tools-page',
  styleUrls: ['./personal-finance-tools-page.scss'],
  templateUrl: './personal-finance-tools-page.html'
})
export class PersonalFinanceToolsPageComponent implements OnDestroy {
  public pathAlternativeTo =
    publicRoutes.resources.subRoutes.personalFinanceTools.subRoutes.product
      .path + '-';
  public pathResources = publicRoutes.resources.path;
  public pathPersonalFinanceTools =
    publicRoutes.resources.subRoutes.personalFinanceTools.path;
  public personalFinanceTools = personalFinanceTools.sort((a, b) => {
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });
  public routerLinkAbout = publicRoutes.about.routerLink;

  private unsubscribeSubject = new Subject<void>();

  public constructor() {
    addIcons({ chevronForwardOutline });
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
