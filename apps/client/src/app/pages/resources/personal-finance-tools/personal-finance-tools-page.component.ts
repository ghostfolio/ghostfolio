import { Component, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';

import { products } from './products';

@Component({
  host: { class: 'page' },
  selector: 'gf-personal-finance-tools-page',
  styleUrls: ['./personal-finance-tools-page.scss'],
  templateUrl: './personal-finance-tools-page.html'
})
export class PersonalFinanceToolsPageComponent implements OnDestroy {
  public pathAlternativeTo = $localize`open-source-alternative-to` + '-';
  public pathResources = '/' + $localize`resources`;
  public products = products
    .filter(({ key }) => {
      return key !== 'ghostfolio';
    })
    .sort((a, b) => {
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });
  public routerLinkAbout = ['/' + $localize`about`];

  private unsubscribeSubject = new Subject<void>();

  public constructor() {}

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
