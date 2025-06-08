import { internalRoutes } from '@ghostfolio/common/routes';

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
  selector: 'gf-no-transactions-info-indicator',
  styleUrls: ['./no-transactions-info.component.scss'],
  templateUrl: './no-transactions-info.component.html'
})
export class GfNoTransactionsInfoComponent {
  @HostBinding('class.has-border') @Input() hasBorder = true;

  public routerLinkPortfolioActivities = [
    '/' + internalRoutes.portfolio.path,
    internalRoutes.portfolio.subRoutes.activities.path
  ];
}
