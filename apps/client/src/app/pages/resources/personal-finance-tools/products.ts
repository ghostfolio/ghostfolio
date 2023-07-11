import { Product } from '@ghostfolio/common/interfaces';

import { AltooPageComponent } from './products/altoo-page.component';
import { CopilotMoneyPageComponent } from './products/copilot-money-page.component';
import { DeltaPageComponent } from './products/delta-page.component';
import { DivvyDiaryPageComponent } from './products/divvydiary-page.component';
import { ExirioPageComponent } from './products/exirio-page.component';
import { FolisharePageComponent } from './products/folishare-page.component';
import { GetquinPageComponent } from './products/getquin-page.component';
import { GoSpatzPageComponent } from './products/gospatz-page.component';
import { JustEtfPageComponent } from './products/justetf-page.component';
import { KuberaPageComponent } from './products/kubera-page.component';
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
    languages: 'Dutch, English, French, German, Italian, Portuguese, Spanish',
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
    component: CopilotMoneyPageComponent,
    founded: 2019,
    hasFreePlan: false,
    hasSelfHostingAbility: false,
    isOpenSource: false,
    key: 'copilot-money',
    name: 'Copilot Money',
    origin: 'United States',
    pricingPerYear: '$70',
    slogan: 'Do money better with Copilot'
  },
  {
    component: DeltaPageComponent,
    founded: 2017,
    hasFreePlan: true,
    hasSelfHostingAbility: false,
    isOpenSource: false,
    key: 'delta',
    name: 'Delta Investment Tracker',
    note: 'Acquired by eToro',
    origin: 'Belgium',
    slogan: 'The app to track all your investments. Make smart moves only.'
  },
  {
    component: DivvyDiaryPageComponent,
    founded: 2019,
    hasFreePlan: true,
    hasSelfHostingAbility: false,
    isOpenSource: false,
    key: 'divvydiary',
    languages: 'English, German',
    name: 'DivvyDiary',
    origin: 'Germany',
    pricingPerYear: '€65',
    slogan: 'Your personal Dividend Calendar'
  },
  {
    component: ExirioPageComponent,
    founded: 2020,
    hasFreePlan: true,
    hasSelfHostingAbility: false,
    isOpenSource: false,
    key: 'exirio',
    name: 'Exirio',
    origin: 'United States',
    pricingPerYear: '$100',
    slogan: 'All your wealth, in one place.'
  },
  {
    component: FolisharePageComponent,
    hasFreePlan: true,
    hasSelfHostingAbility: false,
    isOpenSource: false,
    key: 'folishare',
    languages: 'English, German',
    name: 'folishare',
    origin: 'Austria',
    pricingPerYear: '$65',
    slogan: 'Take control over your investments'
  },
  {
    component: GetquinPageComponent,
    founded: 2020,
    hasFreePlan: true,
    hasSelfHostingAbility: false,
    isOpenSource: false,
    key: 'getquin',
    languages: 'English, German',
    name: 'getquin',
    origin: 'Germany',
    pricingPerYear: '€48',
    slogan: 'Portfolio Tracker, Analysis & Community'
  },
  {
    component: GoSpatzPageComponent,
    hasFreePlan: true,
    hasSelfHostingAbility: false,
    isOpenSource: false,
    key: 'gospatz',
    name: 'goSPATZ',
    origin: 'Germany',
    slogan: 'Volle Kontrolle über deine Investitionen'
  },
  {
    component: JustEtfPageComponent,
    founded: 2011,
    hasFreePlan: true,
    hasSelfHostingAbility: false,
    isOpenSource: false,
    key: 'justetf',
    name: 'justETF',
    origin: 'Germany',
    pricingPerYear: '€119',
    slogan: 'ETF portfolios made simple'
  },
  {
    component: KuberaPageComponent,
    founded: 2019,
    hasFreePlan: false,
    hasSelfHostingAbility: false,
    isOpenSource: false,
    key: 'kubera',
    name: 'Kubera®',
    origin: 'United States',
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
    origin: 'United States',
    pricingPerYear: '$145',
    region: 'United States',
    slogan: 'Your financial future, in your control'
  },
  {
    component: MonsePageComponent,
    hasFreePlan: false,
    hasSelfHostingAbility: false,
    isOpenSource: false,
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
    component: PlannixPageComponent,
    founded: 2023,
    hasSelfHostingAbility: false,
    isOpenSource: false,
    key: 'plannix',
    name: 'Plannix',
    origin: 'Italy',
    slogan: 'Your Personal Finance Hub'
  },
  {
    component: PortfolioDividendTrackerPageComponent,
    hasFreePlan: false,
    hasSelfHostingAbility: false,
    isOpenSource: false,
    key: 'portfolio-dividend-tracker',
    languages: 'English, Dutch',
    name: 'Portfolio Dividend Tracker',
    origin: 'Netherlands',
    pricingPerYear: '€60',
    slogan: 'Manage all your portfolios'
  },
  {
    component: PortseidoPageComponent,
    founded: 2021,
    hasFreePlan: true,
    hasSelfHostingAbility: false,
    isOpenSource: false,
    key: 'portseido',
    languages: 'Dutch, English, French, German',
    name: 'Portseido',
    origin: 'Thailand',
    pricingPerYear: '$96',
    slogan: 'Portfolio Performance and Dividend Tracker'
  },
  {
    component: ProjectionLabPageComponent,
    founded: 2021,
    hasFreePlan: true,
    hasSelfHostingAbility: true,
    isOpenSource: false,
    key: 'projectionlab',
    name: 'ProjectionLab',
    origin: 'United States',
    pricingPerYear: '$108',
    slogan: 'Build Financial Plans You Love.'
  },
  {
    component: SeekingAlphaPageComponent,
    founded: 2004,
    hasFreePlan: false,
    hasSelfHostingAbility: false,
    isOpenSource: false,
    key: 'seeking-alpha',
    name: 'Seeking Alpha',
    origin: 'United States',
    pricingPerYear: '$239',
    slogan: 'Stock Market Analysis & Tools for Investors'
  },
  {
    component: SharesightPageComponent,
    founded: 2007,
    hasFreePlan: true,
    hasSelfHostingAbility: false,
    isOpenSource: false,
    key: 'sharesight',
    name: 'Sharesight',
    origin: 'New Zealand',
    pricingPerYear: '$135',
    region: 'Global',
    slogan: 'Stock Portfolio Tracker'
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
    component: SumioPageComponent,
    hasFreePlan: true,
    hasSelfHostingAbility: false,
    isOpenSource: false,
    key: 'sumio',
    name: 'Sumio',
    origin: 'Czech Republic',
    pricingPerYear: '$20',
    slogan: 'Sum up and build your wealth.'
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
