import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import { BlogPageComponent } from './blog-page.component';

const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: BlogPageComponent,
    path: '',
    title: $localize`Blog`
  },
  {
    canActivate: [AuthGuard],
    path: '2021/07/hallo-ghostfolio',
    loadComponent: () =>
      import('./2021/07/hallo-ghostfolio/hallo-ghostfolio-page.component').then(
        (c) => c.HalloGhostfolioPageComponent
      ),
    title: 'Hallo Ghostfolio'
  },
  {
    canActivate: [AuthGuard],
    path: '2021/07/hello-ghostfolio',
    loadComponent: () =>
      import('./2021/07/hello-ghostfolio/hello-ghostfolio-page.component').then(
        (c) => c.HelloGhostfolioPageComponent
      ),
    title: 'Hello Ghostfolio'
  },
  {
    canActivate: [AuthGuard],
    path: '2022/01/ghostfolio-first-months-in-open-source',
    loadComponent: () =>
      import(
        './2022/01/first-months-in-open-source/first-months-in-open-source-page.component'
      ).then((c) => c.FirstMonthsInOpenSourcePageComponent),
    title: 'First months in Open Source'
  },
  {
    canActivate: [AuthGuard],
    path: '2022/07/ghostfolio-meets-internet-identity',
    loadComponent: () =>
      import(
        './2022/07/ghostfolio-meets-internet-identity/ghostfolio-meets-internet-identity-page.component'
      ).then((c) => c.GhostfolioMeetsInternetIdentityPageComponent),
    title: 'Ghostfolio meets Internet Identity'
  },
  {
    canActivate: [AuthGuard],
    path: '2022/07/how-do-i-get-my-finances-in-order',
    loadComponent: () =>
      import(
        './2022/07/how-do-i-get-my-finances-in-order/how-do-i-get-my-finances-in-order-page.component'
      ).then((c) => c.HowDoIGetMyFinancesInOrderPageComponent),
    title: 'How do I get my finances in order?'
  },
  {
    canActivate: [AuthGuard],
    path: '2022/08/500-stars-on-github',
    loadComponent: () =>
      import(
        './2022/08/500-stars-on-github/500-stars-on-github-page.component'
      ).then((c) => c.FiveHundredStarsOnGitHubPageComponent),
    title: '500 Stars on GitHub'
  },
  {
    canActivate: [AuthGuard],
    path: '2022/10/hacktoberfest-2022',
    loadComponent: () =>
      import(
        './2022/10/hacktoberfest-2022/hacktoberfest-2022-page.component'
      ).then((c) => c.Hacktoberfest2022PageComponent),
    title: 'Hacktoberfest 2022'
  },
  {
    canActivate: [AuthGuard],
    path: '2022/11/black-friday-2022',
    loadComponent: () =>
      import(
        './2022/11/black-friday-2022/black-friday-2022-page.component'
      ).then((c) => c.BlackFriday2022PageComponent),
    title: 'Black Friday 2022'
  },
  {
    canActivate: [AuthGuard],
    path: '2022/12/the-importance-of-tracking-your-personal-finances',
    loadComponent: () =>
      import(
        './2022/12/the-importance-of-tracking-your-personal-finances/the-importance-of-tracking-your-personal-finances-page.component'
      ).then((c) => c.TheImportanceOfTrackingYourPersonalFinancesPageComponent),
    title: 'The importance of tracking your personal finances'
  },
  {
    canActivate: [AuthGuard],
    path: '2023/01/ghostfolio-auf-sackgeld-vorgestellt',
    loadComponent: () =>
      import(
        './2023/01/ghostfolio-auf-sackgeld-vorgestellt/ghostfolio-auf-sackgeld-vorgestellt-page.component'
      ).then((c) => c.GhostfolioAufSackgeldVorgestelltPageComponent),
    title: 'Ghostfolio auf Sackgeld.com vorgestellt'
  },
  {
    canActivate: [AuthGuard],
    path: '2023/02/ghostfolio-meets-umbrel',
    loadComponent: () =>
      import(
        './2023/02/ghostfolio-meets-umbrel/ghostfolio-meets-umbrel-page.component'
      ).then((c) => c.GhostfolioMeetsUmbrelPageComponent),
    title: 'Ghostfolio meets Umbrel'
  },
  {
    canActivate: [AuthGuard],
    path: '2023/03/ghostfolio-reaches-1000-stars-on-github',
    loadComponent: () =>
      import(
        './2023/03/1000-stars-on-github/1000-stars-on-github-page.component'
      ).then((c) => c.ThousandStarsOnGitHubPageComponent),
    title: 'Ghostfolio reaches 1’000 Stars on GitHub'
  },
  {
    canActivate: [AuthGuard],
    path: '2023/05/unlock-your-financial-potential-with-ghostfolio',
    loadComponent: () =>
      import(
        './2023/05/unlock-your-financial-potential-with-ghostfolio/unlock-your-financial-potential-with-ghostfolio-page.component'
      ).then((c) => c.UnlockYourFinancialPotentialWithGhostfolioPageComponent),
    title: 'Unlock your Financial Potential with Ghostfolio'
  },
  {
    canActivate: [AuthGuard],
    path: '2023/07/exploring-the-path-to-fire',
    loadComponent: () =>
      import(
        './2023/07/exploring-the-path-to-fire/exploring-the-path-to-fire-page.component'
      ).then((c) => c.ExploringThePathToFirePageComponent),
    title: 'Exploring the Path to FIRE'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class BlogPageRoutingModule {}
