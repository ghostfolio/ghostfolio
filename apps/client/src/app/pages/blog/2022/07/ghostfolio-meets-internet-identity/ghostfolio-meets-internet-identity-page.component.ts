import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';

@Component({
  host: { class: 'page' },
  imports: [MatButtonModule, RouterModule],
  selector: 'gf-ghostfolio-meets-internet-identity-page',
  standalone: true,
  templateUrl: './ghostfolio-meets-internet-identity-page.html'
})
export class GhostfolioMeetsInternetIdentityPageComponent {}
