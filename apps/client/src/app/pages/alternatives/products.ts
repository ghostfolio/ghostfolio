import { Product } from '@ghostfolio/common/interfaces';

import { AltooPageComponent } from './products/altoo-page.component';
import { GetquinPageComponent } from './products/getquin-page.component';
import { KuberaPageComponent } from './products/kubera-page.component';
import { MaybePageComponent } from './products/maybe-page.component';
import { ParqetPageComponent } from './products/parqet-page.component';
import { SimplePortfolioPageComponent } from './products/simple-portfolio-page.component';
import { UtlunaPageComponent } from './products/utluna-page.component';
import { YeekateePageComponent } from './products/yeekatee-page.component';

export const products: Product[] = [
  {
    component: undefined,
    founded: 2021,
    hasFreePlan: true,
    isOpenSource: true,
    key: 'ghostfolio',
    languages:
      'English, Dutch, French, German, Italian, Portuguese and Spanish',
    name: 'Ghostfolio',
    origin: 'Switzerland',
    pricingPerYear: '$19',
    region: 'Global',
    slogan: 'Open Source Wealth Management'
  },
  {
    component: AltooPageComponent,
    founded: 2017,
    isOpenSource: false,
    key: 'altoo',
    name: 'Altoo-Wealth-Plattform',
    origin: 'Switzerland',
    slogan: 'Simplicity for Complex Wealth'
  },
  {
    component: GetquinPageComponent,
    founded: 2020,
    hasFreePlan: true,
    isOpenSource: false,
    languages: 'English, German',
    key: 'getquin',
    name: 'getquin',
    origin: 'Germany',
    pricingPerYear: '€48',
    slogan: 'Portfolio Tracker, Analysis & Community'
  },
  {
    component: KuberaPageComponent,
    founded: 2019,
    hasFreePlan: false,
    isOpenSource: false,
    key: 'kubera',
    name: 'Kubera®',
    origin: 'USA',
    pricingPerYear: '$150',
    slogan: 'The Time Machine for your Net Worth'
  },
  {
    component: MaybePageComponent,
    founded: 2021,
    isOpenSource: false,
    key: 'maybe',
    languages: 'English',
    name: 'Maybe Finance',
    note: 'Sunset in 2023',
    origin: 'USA',
    pricingPerYear: '$145',
    region: 'USA',
    slogan: 'Your financial future, in your control'
  },
  {
    component: ParqetPageComponent,
    founded: 2020,
    hasFreePlan: true,
    isOpenSource: false,
    key: 'parqet',
    name: 'Parqet',
    origin: 'Germany',
    pricingPerYear: '€88',
    region: 'Austria, Germany, Switzerland',
    slogan: 'Dein Vermögen immer im Blick'
  },
  {
    component: SimplePortfolioPageComponent,
    hasFreePlan: true,
    isOpenSource: false,
    key: 'simple-portfolio',
    name: 'Simple Portfolio',
    origin: 'Czech Republic',
    pricingPerYear: '€80',
    slogan: 'Stock Portfolio Tracker'
  },
  {
    component: UtlunaPageComponent,
    hasFreePlan: true,
    isOpenSource: false,
    key: 'utluna',
    languages: 'English, French, German',
    name: 'Utluna',
    origin: 'Switzerland',
    pricingPerYear: '$300',
    slogan: 'Your Portfolio. Revealed.'
  },
  {
    component: YeekateePageComponent,
    founded: 2021,
    isOpenSource: false,
    key: 'yeekatee',
    name: 'yeekatee',
    origin: 'Switzerland',
    region: 'Switzerland',
    slogan: 'Connect. Share. Invest.'
  }
];
