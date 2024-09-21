import { CommonModule } from '@angular/common';
import {
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  Component,
  Input
} from '@angular/core';
import { RouterModule } from '@angular/router';

import { GfLogoComponent } from '../logo';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, GfLogoComponent, RouterModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'gf-membership-card',
  standalone: true,
  styleUrls: ['./membership-card.component.scss'],
  templateUrl: './membership-card.component.html'
})
export class GfMembershipCardComponent {
  @Input() public expiresAt: string;
  @Input() public name: string;

  public routerLinkPricing = ['/' + $localize`:snake-case:pricing`];
}
