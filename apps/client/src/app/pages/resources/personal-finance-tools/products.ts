import { Product } from '@ghostfolio/common/interfaces';

import { AltooPageComponent } from './products/altoo-page.component';
import { GetquinPageComponent } from './products/getquin-page.component';
import { KuberaPageComponent } from './products/kubera-page.component';
import { MaybeFinancePageComponent } from './products/maybe-finance-page.component';
import { ParqetPageComponent } from './products/parqet-page.component';
import { SimplePortfolioPageComponent } from './products/simple-portfolio-page.component';
import { SnowballAnalyticsPageComponent } from './products/snowball-analytics-page.component';
import { UtlunaPageComponent } from './products/utluna-page.component';
import { YeekateePageComponent } from './products/yeekatee-page.component';

export const products: Product[] = [
  {
    component: undefined,
    founded: 2021,
    hasFreePlan: true,
    hasSelfHostingAbility: true,
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
    hasSelfHostingAbility: false,
    isOpenSource: false,
    key: 'altoo',
    name: 'Altoo Wealth Platform',
    origin: 'Switzerland',
    slogan: 'Simplicity for Complex Wealth'
  },
  {
    component: GetquinPageComponent,
    founded: 2020,
    hasFreePlan: true,
    hasSelfHostingAbility: false,
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
    hasSelfHostingAbility: false,
    isOpenSource: false,
    key: 'kubera',
    name: 'Kubera®',
    origin: 'USA',
    pricingPerYear: '$150',
    slogan: 'The Time Machine for your Net Worth'
  },
  {
    component: MaybeFinancePageComponent,
    founded: 2021,
    hasSelfHostingAbility: false,
    isOpenSource: false,
    key: 'maybe-finance',
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
    hasSelfHostingAbility: false,
    hasFreePlan: true,
    isOpenSource: false,
    key: 'parqet',
    name: 'Parqet',
    note: 'Originally named as Tresor One',
    origin: 'Germany',
    pricingPerYear: '€88',
    region: 'Austria, Germany, Switzerland',
    slogan: 'Dein Vermögen immer im Blick'
  },
  {
    component: SimplePortfolioPageComponent,
    hasFreePlan: true,
    hasSelfHostingAbility: false,
    isOpenSource: false,
    key: 'simple-portfolio',
    name: 'Simple Portfolio',
    origin: 'Czech Republic',
    pricingPerYear: '€80',
    slogan: 'Stock Portfolio Tracker'
  },
  {
    component: SnowballAnalyticsPageComponent,
    founded: 2021,
    hasFreePlan: true,
    hasSelfHostingAbility: false,
    isOpenSource: false,
    key: 'snowball-analytics',
    name: 'Snowball Analytics',
    origin: 'France',
    pricingPerYear: '$80',
    slogan: 'Simple and powerful portfolio tracker'
  },
  {
    component: UtlunaPageComponent,
    hasFreePlan: true,
    hasSelfHostingAbility: false,
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
    hasSelfHostingAbility: false,
    isOpenSource: false,
    key: 'yeekatee',
    name: 'yeekatee',
    origin: 'Switzerland',
    region: 'Switzerland',
    slogan: 'Connect. Share. Invest.'
  }
];
