import { ChangeDetectionStrategy, Component } from '@angular/core';

import { LogoItem } from './interfaces/interfaces';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'gf-logo-carousel',
  styleUrls: ['./logo-carousel.component.scss'],
  templateUrl: './logo-carousel.component.html'
})
export class GfLogoCarouselComponent {
  public readonly logos: LogoItem[] = [
    {
      className: 'logo-alternative-to',
      isMask: true,
      name: 'AlternativeTo',
      title: 'AlternativeTo - Crowdsourced software recommendations',
      url: 'https://alternativeto.net'
    },
    {
      className: 'logo-awesome',
      name: 'Awesome Selfhosted',
      title:
        'Awesome-Selfhosted: A list of Free Software network services and web applications which can be hosted on your own servers',
      url: 'https://github.com/awesome-selfhosted/awesome-selfhosted'
    },
    {
      className: 'logo-dev-community',
      isMask: true,
      name: 'DEV Community',
      title:
        'DEV Community - A constructive and inclusive social network for software developers',
      url: 'https://dev.to'
    },
    {
      className: 'logo-hacker-news',
      isMask: true,
      name: 'Hacker News',
      title: 'Hacker News',
      url: 'https://news.ycombinator.com'
    },
    {
      className: 'logo-openalternative',
      isMask: true,
      name: 'OpenAlternative',
      title: 'OpenAlternative: Open Source Alternatives to Popular Software',
      url: 'https://openalternative.co'
    },
    {
      className: 'logo-oss-gallery',
      isMask: true,
      name: 'OSS Gallery',
      title: 'OSS Gallery: Discover the best open-source projects',
      url: 'https://oss.gallery'
    },
    {
      className: 'logo-privacy-tools',
      isMask: true,
      name: 'Privacy Tools',
      title: 'Privacy Tools: Software Alternatives and Encryption',
      url: 'https://www.privacytools.io'
    },
    {
      className: 'logo-product-hunt',
      name: 'Product Hunt',
      title: 'Product Hunt – The best new products in tech.',
      url: 'https://www.producthunt.com'
    },
    {
      className: 'logo-reddit',
      isMask: true,
      name: 'Reddit',
      title: 'Reddit - Dive into anything',
      url: 'https://www.reddit.com'
    },
    {
      className: 'logo-sackgeld',
      isMask: true,
      name: 'Sackgeld',
      title: 'Sackgeld.com – Apps für ein höheres Sackgeld',
      url: 'https://www.sackgeld.com'
    },
    {
      className: 'logo-selfh-st',
      isMask: true,
      name: 'selfh.st',
      title: 'selfh.st — Self-hosted content and software',
      url: 'https://selfh.st'
    },
    {
      className: 'logo-selfhostedhub',
      name: 'SelfhostedHub',
      title: 'SelfhostedHub — Discover best self-hosted software',
      url: 'https://selfhostedhub.com'
    },
    {
      className: 'logo-sourceforge',
      isMask: true,
      name: 'SourceForge',
      title:
        'SourceForge: The Complete Open-Source and Business Software Platform',
      url: 'https://sourceforge.net'
    },
    {
      className: 'logo-umbrel',
      isMask: true,
      name: 'Umbrel',
      title: 'Umbrel — A personal server OS for self-hosting',
      url: 'https://umbrel.com'
    },
    {
      className: 'logo-unraid',
      isMask: true,
      name: 'Unraid',
      title: 'Unraid | Unleash Your Hardware',
      url: 'https://unraid.net'
    }
  ];

  public readonly logosRepeated = [...this.logos, ...this.logos];
}
