import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';

@Component({
  host: { class: 'page' },
  imports: [MatButtonModule, RouterModule],
  selector: 'gf-500-stars-on-github-page',
  standalone: true,
  templateUrl: './500-stars-on-github-page.html'
})
export class FiveHundredStarsOnGitHubPageComponent {
  public routerLinkMarkets = ['/' + $localize`markets`];
  public routerLinkPricing = ['/' + $localize`pricing`];
}
