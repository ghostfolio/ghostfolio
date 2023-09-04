import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';

@Component({
  host: { class: 'page' },
  imports: [MatButtonModule, RouterModule],
  selector: 'gf-hallo-ghostfolio-page',
  standalone: true,
  templateUrl: './hallo-ghostfolio-page.html'
})
export class HalloGhostfolioPageComponent {
  public routerLinkPricing = ['/' + $localize`pricing`];
  public routerLinkResources = ['/' + $localize`resources`];
}
