import { getCountryName } from '@ghostfolio/common/helper';
import { personalFinanceTools } from '@ghostfolio/common/personal-finance-tools';
import { publicRoutes } from '@ghostfolio/common/routes/routes';
import { translate } from '@ghostfolio/ui/i18n';
import { DataService } from '@ghostfolio/ui/services';

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, RouterModule } from '@angular/router';

import { ResolvedProduct } from './interfaces/interfaces';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'page' },
  imports: [MatButtonModule, RouterModule],
  selector: 'gf-product-page',
  styleUrls: ['./product-page.scss'],
  templateUrl: './product-page.html'
})
export class GfProductPageComponent {
  protected readonly price = computed(() => {
    const { subscriptionOffer } = this.dataService.fetchInfo();
    return subscriptionOffer?.price;
  });

  protected readonly product1 = computed<ResolvedProduct>(() => ({
    categories: this.getSortedTranslations([
      'FINANCIAL_PLANNING',
      'NET_WORTH_TRACKING',
      'STOCK_TRACKING'
    ]),
    founded: 2021,
    hasFreePlan: true,
    hasSelfHostingAbility: true,
    isOpenSource: true,
    key: 'ghostfolio',
    languages: [
      'Chinese (简体中文)',
      'Deutsch',
      'English',
      'Español',
      'Français',
      'Italiano',
      // 'Japanese (日本語)',
      'Korean (한국어)',
      'Nederlands',
      'Português',
      'Türkçe'
    ],
    name: 'Ghostfolio',
    origin: getCountryName({ code: 'CH' }),
    platforms: this.getSortedTranslations(['ANDROID', 'WEB']),
    regions: [$localize`Global`],
    slogan: 'Open Source Wealth Management',
    useAnonymously: true
  }));

  protected readonly product2 = computed<ResolvedProduct>(() => {
    const product = personalFinanceTools.find(({ key }) => {
      return key === this.route.snapshot.data['key'];
    });

    const mappedProduct: ResolvedProduct = {
      key: product?.key ?? '',
      name: product?.name ?? '',
      ...product,
      categories: this.getSortedTranslations(product?.categories),
      platforms: this.getSortedTranslations(product?.platforms)
    };

    if (mappedProduct.origin) {
      mappedProduct.origin = getCountryName({ code: mappedProduct.origin });
    }

    if (mappedProduct.regions) {
      mappedProduct.regions = mappedProduct.regions.map((region) => {
        return region === 'Global'
          ? translate(region)
          : getCountryName({ code: region });
      });
    }

    return mappedProduct;
  });

  protected readonly routerLinkAbout = publicRoutes.about.routerLink;
  protected readonly routerLinkFeatures = publicRoutes.features.routerLink;
  protected readonly routerLinkResourcesPersonalFinanceTools =
    publicRoutes.resources.subRoutes.personalFinanceTools.routerLink;

  protected readonly tags = computed<string[]>(() => {
    const product1 = this.product1();
    const product2 = this.product2();

    return Array.from(
      new Set(
        [
          ...[product1, product2].flatMap(
            ({ categories, name, origin, platforms }) => {
              return [
                ...(categories ?? []),
                ...(platforms ?? []),
                name,
                origin
              ];
            }
          ),
          $localize`Alternative`,
          $localize`App`,
          $localize`Community`,
          `Fintech`,
          $localize`Investment`,
          $localize`Investor`,
          $localize`Open Source`,
          `OSS`,
          $localize`Personal Finance`,
          $localize`Portfolio`,
          $localize`Privacy`,
          $localize`Software`,
          $localize`Tool`,
          $localize`User Experience`,
          $localize`Wealth`,
          `WealthTech`
        ].filter((item): item is string => {
          return !!item;
        })
      )
    ).sort((a, b) => {
      return a.localeCompare(b, undefined, { sensitivity: 'base' });
    });
  });

  private readonly dataService = inject(DataService);
  private readonly route = inject(ActivatedRoute);

  private getSortedTranslations(values?: string[]) {
    return values
      ?.map((value) => {
        return translate(value);
      })
      .sort((a, b) => {
        return a.localeCompare(b, undefined, { sensitivity: 'base' });
      });
  }
}
