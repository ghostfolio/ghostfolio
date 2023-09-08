import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';

@Component({
  host: { class: 'page' },
  imports: [MatButtonModule, RouterModule],
  selector: 'gf-ghostfolio-2-page',
  standalone: true,
  templateUrl: './ghostfolio-2-page.html'
})
export class Ghostfolio2PageComponent {
  public routerLinkAbout = ['/' + $localize`about`];
  public routerLinkAboutChangelog = ['/' + $localize`about`, 'changelog'];
  public routerLinkFeatures = ['/' + $localize`features`];
  public routerLinkMarkets = ['/' + $localize`markets`];
}
