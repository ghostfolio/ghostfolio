import { CommonModule } from '@angular/common';
import {
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  Input
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';

import { GfLogoComponent } from '../logo';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, GfLogoComponent, MatButtonModule, RouterModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'gf-no-transactions-info-indicator',
  standalone: true,
  styleUrls: ['./no-transactions-info.component.scss'],
  templateUrl: './no-transactions-info.component.html'
})
export class GfNoTransactionsInfoComponent {
  @HostBinding('class.has-border') @Input() hasBorder = true;

  public constructor() {}
}
