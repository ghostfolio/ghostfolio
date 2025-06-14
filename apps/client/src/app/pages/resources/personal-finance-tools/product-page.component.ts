import { DataService } from '@ghostfolio/client/services/data.service';
import { Product } from '@ghostfolio/common/interfaces';
import { personalFinanceTools } from '@ghostfolio/common/personal-finance-tools';
import { publicRoutes, routes } from '@ghostfolio/common/routes/routes';
import { translate } from '@ghostfolio/ui/i18n';

import { Component, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, RouterModule } from '@angular/router';

@Component({
  host: { class: 'page' },
  imports: [MatButtonModule, RouterModule],
  selector: 'gf-product-page',
  styleUrls: ['./product-page.scss'],
  templateUrl: './product-page.html'
})
export class GfProductPageComponent implements OnInit {
  public key: string;
  public price: number;
  public product1: Product;
  public product2: Product;
  public routerLinkAbout = ['/' + routes.about];
  public routerLinkFeatures = publicRoutes.features.routerLink;
  public routerLinkResourcesPersonalFinanceTools = [
    '/' + routes.resources,
    routes.personalFinanceTools
  ];
  public tags: string[];

  public constructor(
    private dataService: DataService,
    private route: ActivatedRoute
  ) {}

  public ngOnInit() {
    const { subscriptionOffer } = this.dataService.fetchInfo();

    this.price = subscriptionOffer?.price;

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
      regions: [$localize`Global`],
      slogan: 'Open Source Wealth Management',
      useAnonymously: true
    };

    this.product2 = personalFinanceTools.find(({ key }) => {
      return key === this.route.snapshot.data['key'];
    });

    if (this.product2.origin) {
      this.product2.origin = translate(this.product2.origin);
    }

    if (this.product2.regions) {
      this.product2.regions = this.product2.regions.map((region) => {
        return translate(region);
      });
    }

    this.tags = [
      this.product1.name,
      this.product2.name,
      $localize`Alternative`,
      $localize`App`,
      $localize`Budgeting`,
      $localize`Community`,
      $localize`Family Office`,
      `Fintech`,
      $localize`Investment`,
      $localize`Investor`,
      $localize`Open Source`,
      `OSS`,
      $localize`Personal Finance`,
      $localize`Privacy`,
      $localize`Portfolio`,
      $localize`Software`,
      $localize`Tool`,
      $localize`User Experience`,
      $localize`Wealth`,
      $localize`Wealth Management`,
      `WealthTech`
    ].sort((a, b) => {
      return a.localeCompare(b, undefined, { sensitivity: 'base' });
    });
  }
}
