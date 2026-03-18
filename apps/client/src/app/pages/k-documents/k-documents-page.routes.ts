import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import { Routes } from '@angular/router';

import { KDocumentsPageComponent } from './k-documents-page.component';

export const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: KDocumentsPageComponent,
    path: '',
    title: 'K-1 / K-3 Documents'
  },
  {
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./k-document-detail/k-document-detail.component').then(
        (c) => c.KDocumentDetailComponent
      ),
    path: ':id',
    title: 'K-Document Detail'
  }
];
