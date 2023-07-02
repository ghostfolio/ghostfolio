import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';

@Component({
  host: { class: 'page' },
  imports: [MatButtonModule, RouterModule],
  selector: 'gf-the-importance-of-tracking-your-personal-finances-page',
  standalone: true,
  templateUrl: './the-importance-of-tracking-your-personal-finances-page.html'
})
export class TheImportanceOfTrackingYourPersonalFinancesPageComponent {}
