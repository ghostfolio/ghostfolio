import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'gf-page-fab',
  styleUrls: ['./page-fab.component.scss'],
  templateUrl: './page-fab.component.html'
})
export class GfPageFabComponent {}
