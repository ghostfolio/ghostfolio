import { AuthGuard } from '@ghostfolio/client/core/auth.guard';
import { publicRoutes } from '@ghostfolio/common/routes/routes';

import { Routes } from '@angular/router';

import { ChangelogPageComponent } from './changelog-page.component';

export const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: ChangelogPageComponent,
    path: '',
    title: publicRoutes.about.subRoutes.changelog.title
  }
];
