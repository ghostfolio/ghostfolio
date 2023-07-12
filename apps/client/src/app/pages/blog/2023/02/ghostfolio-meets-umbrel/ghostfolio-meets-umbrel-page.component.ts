import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';

@Component({
  host: { class: 'page' },
  imports: [MatButtonModule, RouterModule],
  selector: 'gf-ghostfolio-meets-umbrel-page',
  standalone: true,
  templateUrl: './ghostfolio-meets-umbrel-page.html'
})
export class GhostfolioMeetsUmbrelPageComponent {}
