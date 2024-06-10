import { DataService } from '@ghostfolio/client/services/data.service';
import { Product } from '@ghostfolio/common/interfaces';
import { personalFinanceTools } from '@ghostfolio/common/personal-finance-tools';

import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, RouterModule } from '@angular/router';

@Component({
  host: { class: 'page' },
  imports: [CommonModule, MatButtonModule, RouterModule],
  selector: 'gf-product-page',
  standalone: true,
  styleUrls: ['./product-page.scss'],
  templateUrl: './product-page.html'
})
export class GfProductPageComponent implements OnInit {
  public key: string;
  public price: number;
  public product1: Product;
  public product2: Product;
  public routerLinkAbout = ['/' + $localize`about`];
  public routerLinkFeatures = ['/' + $localize`features`];
  public routerLinkResourcesPersonalFinanceTools = [
    '/' + $localize`resources`,
    'personal-finance-tools'
  ];

  public constructor(
    private dataService: DataService,
    private route: ActivatedRoute
  ) {}

  public ngOnInit() {
    const { subscriptions } = this.dataService.fetchInfo();

    this.price = subscriptions?.default?.price;

    this.product1 = {
      founded: 2021,
      hasFreePlan: true,
      hasSelfHostingAbility: true,
      isOpenSource: true,
      key: 'ghostfolio',
      languages: [
        'Deutsch',
        'English',
        'Español',
        'Français',
        'Italiano',
        'Nederlands',
        'Português',
        'Türkçe',
        '简体中文'
      ],
      name: 'Ghostfolio',
      origin: $localize`Switzerland`,
      region: $localize`Global`,
      slogan: 'Open Source Wealth Management',
      useAnonymously: true
    };

    this.product2 = personalFinanceTools.find(({ key }) => {
      return key === this.route.snapshot.data['key'];
    });
  }
}
