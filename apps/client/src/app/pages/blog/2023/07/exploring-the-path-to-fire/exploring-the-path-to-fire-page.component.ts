import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';

@Component({
  host: { class: 'page' },
  imports: [MatButtonModule, RouterModule],
  selector: 'gf-exploring-the-path-to-fire-page-page',
  standalone: true,
  templateUrl: './exploring-the-path-to-fire-page.html'
})
export class ExploringThePathToFirePageComponent {
  public routerLinkFeatures = ['/' + $localize`features`];
}
