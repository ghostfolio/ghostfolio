import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';

@Component({
  host: { class: 'page' },
  imports: [MatButtonModule, RouterModule],
  selector: 'gf-ghostfolio-2-page',
  templateUrl: './ghostfolio-2-page.html'
})
export class Ghostfolio2PageComponent {
  public routerLinkAbout = ['/' + $localize`:snake-case:about`];
  public routerLinkAboutChangelog = [
    '/' + $localize`:snake-case:about`,
    'changelog'
  ];
  public routerLinkFeatures = ['/' + $localize`:snake-case:features`];
  public routerLinkMarkets = ['/' + $localize`:snake-case:markets`];
}
