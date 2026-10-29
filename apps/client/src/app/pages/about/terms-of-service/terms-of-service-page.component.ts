import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MarkdownModule } from 'ngx-markdown';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MarkdownModule],
  selector: 'gf-terms-of-service-page',
  styleUrls: ['./terms-of-service-page.scss'],
  templateUrl: './terms-of-service-page.html'
})
export class GfTermsOfServicePageComponent {}
