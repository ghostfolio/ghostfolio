import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MarkdownModule } from 'ngx-markdown';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MarkdownModule],
  selector: 'gf-privacy-policy-page',
  styleUrls: ['./privacy-policy-page.scss'],
  templateUrl: './privacy-policy-page.html'
})
export class GfPrivacyPolicyPageComponent {}
