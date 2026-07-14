import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'page' },
  selector: 'gf-i18n-page',
  standalone: true,
  styleUrls: ['./i18n-page.scss'],
  templateUrl: './i18n-page.html'
})
export class GfI18nPageComponent {}
