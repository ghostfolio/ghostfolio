import { Routes } from '@angular/router';

import { AuthGuard } from '../../../core/auth.guard';
import { GfAboutOverviewPageComponent } from './about-overview-page.component';

export const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: GfAboutOverviewPageComponent,
    path: '',
    title: $localize`About`
  }
];
