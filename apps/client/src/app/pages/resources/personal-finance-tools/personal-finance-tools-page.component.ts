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
  public products = products.filter(({ key }) => {
    return key !== 'ghostfolio';
  });
  public resourcesPath = '/' + $localize`resources`;
  public routerLinkAbout = ['/' + $localize`about`];

  private unsubscribeSubject = new Subject<void>();

  public constructor() {}

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
