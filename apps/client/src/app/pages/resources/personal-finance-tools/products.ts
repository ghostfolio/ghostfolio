import { Product } from '@ghostfolio/common/interfaces';

import { AltooPageComponent } from './products/altoo-page.component';
import { BeanvestPageComponent } from './products/beanvest-page.component';
import { CapMonPageComponent } from './products/capmon-page.component';
import { CopilotMoneyPageComponent } from './products/copilot-money-page.component';
import { DeltaPageComponent } from './products/delta-page.component';
import { DivvyDiaryPageComponent } from './products/divvydiary-page.component';
import { ExirioPageComponent } from './products/exirio-page.component';
import { FinaryPageComponent } from './products/finary-page.component';
import { FolisharePageComponent } from './products/folishare-page.component';
import { GetquinPageComponent } from './products/getquin-page.component';
import { GoSpatzPageComponent } from './products/gospatz-page.component';
import { JustEtfPageComponent } from './products/justetf-page.component';
import { KuberaPageComponent } from './products/kubera-page.component';
import { MarketsShPageComponent } from './products/markets.sh-page.component';
import { MaybeFinancePageComponent } from './products/maybe-finance-page.component';
import { MonsePageComponent } from './products/monse-page.component';
import { ParqetPageComponent } from './products/parqet-page.component';
import { PlannixPageComponent } from './products/plannix-page.component';
import { PortfolioDividendTrackerPageComponent } from './products/portfolio-dividend-tracker-page.component';
import { PortseidoPageComponent } from './products/portseido-page.component';
import { ProjectionLabPageComponent } from './products/projectionlab-page.component';
import { SeekingAlphaPageComponent } from './products/seeking-alpha-page.component';
import { SharesightPageComponent } from './products/sharesight-page.component';
import { SimplePortfolioPageComponent } from './products/simple-portfolio-page.component';
import { SnowballAnalyticsPageComponent } from './products/snowball-analytics-page.component';
import { StocklePageComponent } from './products/stockle-page.component';
import { StockMarketEyePageComponent } from './products/stockmarketeye-page.component';
import { SumioPageComponent } from './products/sumio-page.component';
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
    languages: [
      'Deutsch',
      'English',
      'Español',
      'Français',
      'Italiano',
      'Nederlands',
      'Português'
    ],
    name: 'Ghostfolio',
    origin: $localize`Switzerland`,
    pricingPerYear: '$24',
    region: $localize`Global`,
    slogan: 'Open Source Wealth Management',
    useAnonymously: true
  },
  {
    component: AltooPageComponent,
    founded: 2017,
    hasSelfHostingAbility: false,
    key: 'altoo',
    name: 'Altoo Wealth Platform',
    origin: $localize`Switzerland`,
    slogan: 'Simplicity for Complex Wealth'
  },
  {
    component: BeanvestPageComponent,
    founded: 2020,
    hasFreePlan: true,
    hasSelfHostingAbility: false,
    key: 'beanvest',
    name: 'Beanvest',
    origin: $localize`France`,
    pricingPerYear: '$100',
    slogan: 'Stock Portfolio Tracker for Smart Investors'
  },
  {
    component: CapMonPageComponent,
    founded: 2022,
    key: 'capmon',
    name: 'CapMon.org',
    origin: $localize`Germany`,
    note: 'Sunset in 2023',
    slogan: 'Next Generation Assets Tracking'
  },
  {
    component: CopilotMoneyPageComponent,
    founded: 2019,
    hasFreePlan: false,
    hasSelfHostingAbility: false,
    key: 'copilot-money',
    name: 'Copilot Money',
    origin: $localize`United States`,
    pricingPerYear: '$70',
    slogan: 'Do money better with Copilot'
  },
  {
    component: DeltaPageComponent,
    founded: 2017,
    hasFreePlan: true,
    hasSelfHostingAbility: false,
    key: 'delta',
    name: 'Delta Investment Tracker',
    note: 'Acquired by eToro',
    origin: $localize`Belgium`,
    slogan: 'The app to track all your investments. Make smart moves only.'
  },
  {
    component: DivvyDiaryPageComponent,
    founded: 2019,
    hasFreePlan: true,
    hasSelfHostingAbility: false,
    key: 'divvydiary',
    languages: ['Deutsch', 'English'],
    name: 'DivvyDiary',
    origin: $localize`Germany`,
    pricingPerYear: '€65',
    slogan: 'Your personal Dividend Calendar'
  },
  {
    component: ExirioPageComponent,
    founded: 2020,
    hasFreePlan: true,
    hasSelfHostingAbility: false,
    key: 'exirio',
    name: 'Exirio',
    origin: $localize`United States`,
    pricingPerYear: '$100',
    slogan: 'All your wealth, in one place.'
  },
  {
    component: FinaryPageComponent,
    founded: 2020,
    key: 'finary',
    languages: ['Deutsch', 'English', 'Français'],
    name: 'Finary',
    origin: $localize`United States`,
    slogan: 'Real-Time Portfolio Tracker & Stock Tracker'
  },
  {
    component: FolisharePageComponent,
    hasFreePlan: true,
    hasSelfHostingAbility: false,
    key: 'folishare',
    languages: ['Deutsch', 'English'],
    name: 'folishare',
    origin: $localize`Austria`,
    pricingPerYear: '$65',
    slogan: 'Take control over your investments'
  },
  {
    component: GetquinPageComponent,
    founded: 2020,
    hasFreePlan: true,
    hasSelfHostingAbility: false,
    key: 'getquin',
    languages: ['Deutsch', 'English'],
    name: 'getquin',
    origin: $localize`Germany`,
    pricingPerYear: '€48',
    slogan: 'Portfolio Tracker, Analysis & Community'
  },
  {
    component: GoSpatzPageComponent,
    hasFreePlan: true,
    hasSelfHostingAbility: false,
    key: 'gospatz',
    name: 'goSPATZ',
    origin: $localize`Germany`,
    slogan: 'Volle Kontrolle über deine Investitionen'
  },
  {
    component: JustEtfPageComponent,
    founded: 2011,
    hasFreePlan: true,
    hasSelfHostingAbility: false,
    key: 'justetf',
    name: 'justETF',
    origin: $localize`Germany`,
    pricingPerYear: '€119',
    slogan: 'ETF portfolios made simple'
  },
  {
    component: KuberaPageComponent,
    founded: 2019,
    hasFreePlan: false,
    hasSelfHostingAbility: false,
    key: 'kubera',
    name: 'Kubera®',
    origin: $localize`United States`,
    pricingPerYear: '$150',
    slogan: 'The Time Machine for your Net Worth'
  },
  {
    component: MarketsShPageComponent,
    founded: 2022,
    hasFreePlan: true,
    hasSelfHostingAbility: false,
    key: 'markets.sh',
    languages: ['English'],
    name: 'markets.sh',
    origin: $localize`Germany`,
    pricingPerYear: '€168',
    region: $localize`Global`,
    slogan: 'Track your investments'
  },
  {
    component: MaybeFinancePageComponent,
    founded: 2021,
    hasSelfHostingAbility: false,
    key: 'maybe-finance',
    languages: ['English'],
    name: 'Maybe Finance',
    note: 'Sunset in 2023',
    origin: $localize`United States`,
    pricingPerYear: '$145',
    region: $localize`United States`,
    slogan: 'Your financial future, in your control'
  },
  {
    component: MonsePageComponent,
    hasFreePlan: false,
    hasSelfHostingAbility: false,
    key: 'monse',
    name: 'Monse',
    pricingPerYear: '$60',
    slogan: 'Gain financial control and keep your data private.'
  },
  {
    component: ParqetPageComponent,
    founded: 2020,
    hasSelfHostingAbility: false,
    hasFreePlan: true,
    key: 'parqet',
    name: 'Parqet',
    note: 'Originally named as Tresor One',
    origin: $localize`Germany`,
    pricingPerYear: '€88',
    region: 'Austria, Germany, Switzerland',
    slogan: 'Dein Vermögen immer im Blick'
  },
  {
    component: PlannixPageComponent,
    founded: 2023,
    hasSelfHostingAbility: false,
    key: 'plannix',
    name: 'Plannix',
    origin: $localize`Italy`,
    slogan: 'Your Personal Finance Hub'
  },
  {
    component: PortfolioDividendTrackerPageComponent,
    hasFreePlan: false,
    hasSelfHostingAbility: false,
    key: 'portfolio-dividend-tracker',
    languages: ['English', 'Nederlands'],
    name: 'Portfolio Dividend Tracker',
    origin: $localize`Netherlands`,
    pricingPerYear: '€60',
    slogan: 'Manage all your portfolios'
  },
  {
    component: PortseidoPageComponent,
    founded: 2021,
    hasFreePlan: true,
    hasSelfHostingAbility: false,
    key: 'portseido',
    languages: ['Deutsch', 'English', 'Français', 'Nederlands'],
    name: 'Portseido',
    origin: $localize`Thailand`,
    pricingPerYear: '$96',
    slogan: 'Portfolio Performance and Dividend Tracker'
  },
  {
    component: ProjectionLabPageComponent,
    founded: 2021,
    hasFreePlan: true,
    hasSelfHostingAbility: true,
    key: 'projectionlab',
    name: 'ProjectionLab',
    origin: $localize`United States`,
    pricingPerYear: '$108',
    slogan: 'Build Financial Plans You Love.'
  },
  {
    component: SeekingAlphaPageComponent,
    founded: 2004,
    hasFreePlan: false,
    hasSelfHostingAbility: false,
    key: 'seeking-alpha',
    name: 'Seeking Alpha',
    origin: $localize`United States`,
    pricingPerYear: '$239',
    slogan: 'Stock Market Analysis & Tools for Investors'
  },
  {
    component: SharesightPageComponent,
    founded: 2007,
    hasFreePlan: true,
    hasSelfHostingAbility: false,
    key: 'sharesight',
    name: 'Sharesight',
    origin: $localize`New Zealand`,
    pricingPerYear: '$135',
    region: $localize`Global`,
    slogan: 'Stock Portfolio Tracker'
  },
  {
    component: SimplePortfolioPageComponent,
    hasFreePlan: true,
    hasSelfHostingAbility: false,
    key: 'simple-portfolio',
    name: 'Simple Portfolio',
    origin: $localize`Czech Republic`,
    pricingPerYear: '€80',
    slogan: 'Stock Portfolio Tracker'
  },
  {
    component: SnowballAnalyticsPageComponent,
    founded: 2021,
    hasFreePlan: true,
    hasSelfHostingAbility: false,
    key: 'snowball-analytics',
    name: 'Snowball Analytics',
    origin: $localize`France`,
    pricingPerYear: '$80',
    slogan: 'Simple and powerful portfolio tracker'
  },
  {
    component: StocklePageComponent,
    key: 'stockle',
    name: 'Stockle',
    origin: $localize`Finland`,
    slogan: 'Supercharge your investments tracking experience'
  },
  {
    component: StockMarketEyePageComponent,
    founded: 2008,
    key: 'stockmarketeye',
    name: 'StockMarketEye',
    origin: $localize`France`,
    note: 'Sunset in 2023',
    slogan: 'A Powerful Portfolio & Investment Tracking App'
  },
  {
    component: SumioPageComponent,
    hasFreePlan: true,
    hasSelfHostingAbility: false,
    key: 'sumio',
    name: 'Sumio',
    origin: $localize`Czech Republic`,
    pricingPerYear: '$20',
    slogan: 'Sum up and build your wealth.'
  },
  {
    component: UtlunaPageComponent,
    hasFreePlan: true,
    hasSelfHostingAbility: false,
    key: 'utluna',
    languages: ['Deutsch', 'English', 'Français'],
    name: 'Utluna',
    origin: $localize`Switzerland`,
    pricingPerYear: '$300',
    slogan: 'Your Portfolio. Revealed.',
    useAnonymously: true
  },
  {
    component: YeekateePageComponent,
    founded: 2021,
    hasSelfHostingAbility: false,
    key: 'yeekatee',
    name: 'yeekatee',
    origin: $localize`Switzerland`,
    region: $localize`Switzerland`,
    slogan: 'Connect. Share. Invest.'
  }
];
