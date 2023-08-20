import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';

@Component({
  host: { class: 'page' },
  imports: [MatButtonModule, RouterModule],
  selector: 'gf-unlock-your-financial-potential-with-ghostfolio-page',
  standalone: true,
  templateUrl: './unlock-your-financial-potential-with-ghostfolio-page.html'
})
export class UnlockYourFinancialPotentialWithGhostfolioPageComponent {
  public routerLinkFeatures = ['/' + $localize`features`];
  public routerLinkResources = ['/' + $localize`resources`];
}
