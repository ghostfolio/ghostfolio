import { Component } from '@angular/core';

@Component({
  selector: 'gf-resources-overview',
  templateUrl: './resources-overview.component.html',
  styleUrls: ['./resources-overview.component.scss']
})
export class ResourcesOverviewComponent {
  public overviewItems = [
    {
      title: 'Frequently Asked Questions (FAQ)',
      description:
        'Find quick answers to commonly asked questions about Ghostfolio in our Frequently Asked Questions (FAQ) section.',
      link: '/faq'
    },
    {
      title: 'Guides',
      description:
        'Explore our guides to help you get started with investing and managing your finances.',
      link: '/resources/guides'
    },
    {
      title: 'Markets',
      description:
        'Access various market resources and tools to stay informed about financial markets.',
      link: '/resources/markets'
    },
    {
      title: 'Glossary',
      description:
        'Learn key financial terms and concepts in our comprehensive glossary.',
      link: '/resources/glossary'
    }
  ];
}
