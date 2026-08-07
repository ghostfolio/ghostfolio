import { GfAdminJobsComponent } from '@ghostfolio/client/components/admin-jobs/admin-jobs.component';
import { GfAdminMarketDataComponent } from '@ghostfolio/client/components/admin-market-data/admin-market-data.component';
import { GfAdminOverviewComponent } from '@ghostfolio/client/components/admin-overview/admin-overview.component';
import { GfAdminSettingsComponent } from '@ghostfolio/client/components/admin-settings/admin-settings.component';
import { GfAdminUsersComponent } from '@ghostfolio/client/components/admin-users/admin-users.component';
import { AuthGuard } from '@ghostfolio/client/core/auth.guard';
import { internalRoutes } from '@ghostfolio/common/routes/routes';

import { Routes, UrlMatcher, UrlSegment } from '@angular/router';

import { AdminPageComponent } from './admin-page.component';

// Matches both the users list and the user detail dialog route within a single
// route configuration so that the component is reused (and not re-created) when
// the user detail dialog is opened or closed
const usersMatcher: UrlMatcher = (segments: UrlSegment[]) => {
  if (
    segments[0]?.path !== internalRoutes.adminControl.subRoutes.users.path ||
    segments.length > 2
  ) {
    return null;
  }

  if (segments.length === 2) {
    return {
      consumed: segments,
      posParams: { userId: segments[1] }
    };
  }

  return { consumed: segments };
};

export const routes: Routes = [
  {
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        component: GfAdminOverviewComponent,
        title: internalRoutes.adminControl.title
      },
      {
        path: internalRoutes.adminControl.subRoutes.jobs.path,
        component: GfAdminJobsComponent,
        title: internalRoutes.adminControl.subRoutes.jobs.title
      },
      {
        path: internalRoutes.adminControl.subRoutes.marketData.path,
        component: GfAdminMarketDataComponent,
        title: internalRoutes.adminControl.subRoutes.marketData.title
      },
      {
        path: internalRoutes.adminControl.subRoutes.settings.path,
        component: GfAdminSettingsComponent,
        title: internalRoutes.adminControl.subRoutes.settings.title
      },
      {
        component: GfAdminUsersComponent,
        matcher: usersMatcher,
        title: internalRoutes.adminControl.subRoutes.users.title
      }
    ],
    component: AdminPageComponent,
    path: ''
  }
];
