import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';

export interface LogoItem {
  name: string;
  url: string;
  title: string;
  className: string;
  isMask?: boolean;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  selector: 'gf-logo-carousel',
  styleUrls: ['./logo-carousel.component.scss'],
  templateUrl: './logo-carousel.component.html'
})
export class GfLogoCarouselComponent {
  public readonly logos: LogoItem[] = [
    {
      name: 'AlternativeTo',
      url: 'https://alternativeto.net',
      title: 'AlternativeTo - Crowdsourced software recommendations',
      className: 'logo-alternative-to',
      isMask: true
    },
    {
      name: 'Awesome Selfhosted',
      url: 'https://github.com/awesome-selfhosted/awesome-selfhosted',
      title:
        'Awesome-Selfhosted: A list of Free Software network services and web applications which can be hosted on your own servers',
      className: 'logo-awesome'
    },
    {
      name: 'DEV Community',
      url: 'https://dev.to',
      title:
        'DEV Community - A constructive and inclusive social network for software developers',
      className: 'logo-dev-community',
      isMask: true
    },
    {
      name: 'Hacker News',
      url: 'https://news.ycombinator.com',
      title: 'Hacker News',
      className: 'logo-hacker-news',
      isMask: true
    },
    {
      name: 'OpenAlternative',
      url: 'https://openalternative.co',
      title: 'OpenAlternative: Open Source Alternatives to Popular Software',
      className: 'logo-openalternative',
      isMask: true
    },
    {
      name: 'Privacy Tools',
      url: 'https://www.privacytools.io',
      title: 'Privacy Tools: Software Alternatives and Encryption',
      className: 'logo-privacy-tools',
      isMask: true
    },
    {
      name: 'Product Hunt',
      url: 'https://www.producthunt.com',
      title: 'Product Hunt – The best new products in tech.',
      className: 'logo-product-hunt'
    },
    {
      name: 'Reddit',
      url: 'https://www.reddit.com',
      title: 'Reddit - Dive into anything',
      className: 'logo-reddit',
      isMask: true
    },
    {
      name: 'Sackgeld',
      url: 'https://www.sackgeld.com',
      title: 'Sackgeld.com – Apps für ein höheres Sackgeld',
      className: 'logo-sackgeld',
      isMask: true
    },
    {
      name: 'selfh.st',
      url: 'https://selfh.st',
      title: 'selfh.st — Self-hosted content and software',
      className: 'logo-selfh-st',
      isMask: true
    },
    {
      name: 'SourceForge',
      url: 'https://sourceforge.net',
      title:
        'SourceForge: The Complete Open-Source and Business Software Platform',
      className: 'logo-sourceforge',
      isMask: true
    },
    {
      name: 'Umbrel',
      url: 'https://umbrel.com',
      title: 'Umbrel — A personal server OS for self-hosting',
      className: 'logo-umbrel',
      isMask: true
    },
    {
      name: 'Unraid',
      url: 'https://unraid.net',
      title: 'Unraid | Unleash Your Hardware',
      className: 'logo-unraid',
      isMask: true
    }
  ];

  // Duplicate logos for seamless infinite scroll
  public readonly duplicatedLogos = [...this.logos, ...this.logos];
}
