import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';

@Component({
  host: { class: 'page' },
  imports: [MatButtonModule, RouterModule],
  selector: 'gf-hacktoberfest-2023-debriefing-page',
  templateUrl: './hacktoberfest-2023-debriefing-page.html'
})
export class Hacktoberfest2023DebriefingPageComponent {
  public routerLinkAbout = ['/' + $localize`:snake-case:about`];
  public routerLinkFeatures = ['/' + $localize`:snake-case:features`];
}
