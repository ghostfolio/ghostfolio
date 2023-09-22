import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';

@Component({
  host: { class: 'page' },
  imports: [MatButtonModule, RouterModule],
  selector: 'gf-hacktoberfest-2023-page',
  standalone: true,
  templateUrl: './hacktoberfest-2023-page.html'
})
export class Hacktoberfest2023PageComponent {
  public routerLinkAbout = ['/' + $localize`about`];
}
