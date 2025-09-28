import { publicRoutes } from '@ghostfolio/common/routes/routes';

import { Routes } from '@angular/router';

import { AuthGuard } from '../../../core/auth.guard';
import { GfChangelogPageComponent } from './changelog-page.component';

export const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: GfChangelogPageComponent,
    path: '',
    title: publicRoutes.about.subRoutes.changelog.title
  }
];
