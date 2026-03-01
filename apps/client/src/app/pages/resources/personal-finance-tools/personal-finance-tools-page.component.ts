import { personalFinanceTools } from '@ghostfolio/common/personal-finance-tools';
import { publicRoutes } from '@ghostfolio/common/routes/routes';

import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { RouterModule } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronForwardOutline } from 'ionicons/icons';

@Component({
  host: { class: 'page' },
  imports: [IonIcon, MatCardModule, RouterModule],
  selector: 'gf-personal-finance-tools-page',
  styleUrls: ['./personal-finance-tools-page.scss'],
  templateUrl: './personal-finance-tools-page.html'
})
export class PersonalFinanceToolsPageComponent {
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

  public constructor() {
    addIcons({ chevronForwardOutline });
  }
}
