import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';

@Component({
  host: { class: 'page' },
  imports: [MatButtonModule, RouterModule],
  selector: 'gf-how-do-i-get-my-finances-in-order-page',
  templateUrl: './how-do-i-get-my-finances-in-order-page.html'
})
export class HowDoIGetMyFinancesInOrderPageComponent {
  public routerLinkResources = ['/' + $localize`:snake-case:resources`];
}
