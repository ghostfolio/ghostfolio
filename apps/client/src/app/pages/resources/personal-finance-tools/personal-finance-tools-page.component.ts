import { personalFinanceTools } from '@ghostfolio/common/personal-finance-tools';
import { publicRoutes } from '@ghostfolio/common/routes/routes';

import { Component, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';

@Component({
  host: { class: 'page' },
  selector: 'gf-personal-finance-tools-page',
  styleUrls: ['./personal-finance-tools-page.scss'],
  templateUrl: './personal-finance-tools-page.html',
  standalone: false
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

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
