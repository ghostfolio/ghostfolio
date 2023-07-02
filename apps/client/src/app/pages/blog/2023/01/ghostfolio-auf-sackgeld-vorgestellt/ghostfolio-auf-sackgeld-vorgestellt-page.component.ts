import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';

@Component({
  host: { class: 'page' },
  imports: [MatButtonModule, RouterModule],
  selector: 'gf-ghostfolio-auf-sackgeld-vorgestellt-page',
  standalone: true,
  templateUrl: './ghostfolio-auf-sackgeld-vorgestellt-page.html'
})
export class GhostfolioAufSackgeldVorgestelltPageComponent {}
