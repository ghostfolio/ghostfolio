import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';

@Component({
  host: { class: 'page' },
  imports: [MatButtonModule, RouterModule],
  selector: 'gf-hacktoberfest-2024-page',
  standalone: true,
  templateUrl: './hacktoberfest-2024-page.html'
})
export class Hacktoberfest2024PageComponent {
  public routerLinkAbout = ['/' + $localize`:snake-case:about`];
}
