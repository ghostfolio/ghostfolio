import { paths } from '@ghostfolio/client/core/paths';
import { personalFinanceTools } from '@ghostfolio/common/personal-finance-tools';

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
  public pathAlternativeTo = $localize`open-source-alternative-to` + '-';
  public pathResources = '/' + $localize`resources`;
  public personalFinanceTools = personalFinanceTools.sort((a, b) => {
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });
  public routerLinkAbout = ['/' + paths.about];

  private unsubscribeSubject = new Subject<void>();

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
