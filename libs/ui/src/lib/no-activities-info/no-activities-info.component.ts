import { internalRoutes } from '@ghostfolio/common/routes/routes';

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
  imports: [GfLogoComponent, MatButtonModule, RouterModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'gf-no-activities-info',
  styleUrls: ['./no-activities-info.component.scss'],
  templateUrl: './no-activities-info.component.html'
})
export class GfNoActivitiesInfoComponent {
  @HostBinding('class.has-border') @Input() hasBorder = true;

  public routerLinkPortfolioActivitiesCreate =
    internalRoutes.portfolio.subRoutes.activities.subRoutes.create.routerLink;
}
