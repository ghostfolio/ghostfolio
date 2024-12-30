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
      title: 'Frequently Asked Questions (FAQ)',
      description:
        'Find quick answers to commonly asked questions about Ghostfolio in our Frequently Asked Questions (FAQ) section.',
      link: ['/' + $localize`:snake-case:faq`]
    },
    {
      title: 'Guides',
      description:
        'Explore our guides to help you get started with investing and managing your finances.',
      link: [
        '/' + $localize`:snake-case:resources`,
        $localize`:snake-case:guides`
      ]
    },
    {
      title: 'Markets',
      description:
        'Access various market resources and tools to stay informed about financial markets.',
      link: [
        '/' + $localize`:snake-case:resources`,
        $localize`:snake-case:markets`
      ]
    },
    {
      title: 'Glossary',
      description:
        'Learn key financial terms and concepts in our comprehensive glossary.',
      link: [
        '/' + $localize`:snake-case:resources`,
        $localize`:snake-case:glossary`
      ]
    }
  ];
}
