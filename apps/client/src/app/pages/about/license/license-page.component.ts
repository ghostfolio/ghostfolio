import { Component } from '@angular/core';
import { MarkdownModule } from 'ngx-markdown';

@Component({
  imports: [MarkdownModule],
  selector: 'gf-license-page',
  styleUrls: ['./license-page.scss'],
  templateUrl: './license-page.html'
})
export class GfLicensePageComponent {}
