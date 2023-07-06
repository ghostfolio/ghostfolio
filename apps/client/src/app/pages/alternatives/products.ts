import { Product } from '@ghostfolio/common/interfaces';
import { MaybePageComponent } from './products/maybe-page.component';
import { ParqetPageComponent } from './products/parqet-page.component';
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
    pricing: 'Starting from $19 / year',
    region: 'Global',
    slogan: 'Open Source Wealth Management'
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
    pricing: 'Starting from $145 / year',
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
    pricing: 'Starting from €88 / year',
    region: 'Austria, Germany, Switzerland',
    slogan: 'Dein Vermögen immer im Blick'
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
