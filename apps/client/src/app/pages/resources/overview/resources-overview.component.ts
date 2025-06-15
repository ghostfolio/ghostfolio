import { publicRoutes, routes } from '@ghostfolio/common/routes/routes';

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
      routerLink: ['/' + routes.resources, routes.guides],
      title: 'Guides'
    },
    {
      description:
        'Access various market resources and tools to stay informed about financial markets.',
      routerLink: ['/' + routes.resources, routes.markets],
      title: 'Markets'
    },
    {
      description:
        'Learn key financial terms and concepts in our comprehensive glossary.',
      routerLink: ['/' + routes.resources, routes.glossary],
      title: 'Glossary'
    }
  ];
}
