import { internalRoutes } from '@ghostfolio/common/routes/routes';

import { Routes } from '@angular/router';

import { JournalPageComponent } from './journal-page.component';

export const routes: Routes = [
  {
    component: JournalPageComponent,
    path: '',
    title: internalRoutes.portfolio.subRoutes.journal.title
  }
];
