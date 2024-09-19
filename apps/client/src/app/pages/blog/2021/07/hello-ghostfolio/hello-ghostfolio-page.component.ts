import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';

@Component({
  host: { class: 'page' },
  imports: [MatButtonModule, RouterModule],
  selector: 'gf-hello-ghostfolio-page',
  standalone: true,
  templateUrl: './hello-ghostfolio-page.html'
})
export class HelloGhostfolioPageComponent {
  public routerLinkPricing = ['/' + $localize`:snake-case:pricing`];
  public routerLinkResources = ['/' + $localize`:snake-case:resources`];
}
