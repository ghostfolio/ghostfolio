import { publicRoutes } from '@ghostfolio/common/routes/routes';

import { Component } from '@angular/core';

@Component({
  selector: 'gf-resources-overview',
  styleUrls: ['./resources-overview.component.scss'],
  templateUrl: './resources-overview.component.html',
  standalone: false
})
export class ResourcesOverviewComponent {
  public overviewItems = [
    {
      description:
        'Find quick answers to commonly asked questions about Ghostfolio in our Frequently Asked Questions (FAQ) section.',
      routerLink: publicRoutes.faq.routerLink,
      title: publicRoutes.faq.title
    },
    {
      description:
        'Explore our guides to help you get started with investing and managing your finances.',
      routerLink: publicRoutes.resources.subRoutes.guides.routerLink,
      title: publicRoutes.resources.subRoutes.guides.title
    },
    {
      description:
        'Access various market resources and tools to stay informed about financial markets.',
      routerLink: publicRoutes.resources.subRoutes.markets.routerLink,
      title: publicRoutes.resources.subRoutes.markets.title
    },
    {
      description:
        'Learn key financial terms and concepts in our comprehensive glossary.',
      routerLink: publicRoutes.resources.subRoutes.glossary.routerLink,
      title: publicRoutes.resources.subRoutes.glossary.title
    }
  ];
}
