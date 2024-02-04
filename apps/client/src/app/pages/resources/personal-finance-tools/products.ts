import { Product } from '@ghostfolio/common/interfaces';

import { AllInvestViewPageComponent } from './products/allinvestview-page.component';
import { AllvueSystemsPageComponent } from './products/allvue-systems-page.component';
import { AltooPageComponent } from './products/altoo-page.component';
import { BasilFinancePageComponent } from './products/basil-finance-page.component';
import { BeanvestPageComponent } from './products/beanvest-page.component';
import { CapitallyPageComponent } from './products/capitally-page.component';
import { CapMonPageComponent } from './products/capmon-page.component';
import { CompoundPlanningPageComponent } from './products/compound-planning-page.component';
import { CopilotMoneyPageComponent } from './products/copilot-money-page.component';
import { DeFiPageComponent } from './products/de.fi-page.component';
import { DeltaPageComponent } from './products/delta-page.component';
import { DivvyDiaryPageComponent } from './products/divvydiary-page.component';
import { EightFiguresPageComponent } from './products/eightfigures-page.component';
import { EmpowerPageComponent } from './products/empower-page.component';
import { ExirioPageComponent } from './products/exirio-page.component';
import { FinaPageComponent } from './products/fina-page.component';
import { FinaryPageComponent } from './products/finary-page.component';
import { FinWisePageComponent } from './products/finwise-page.component';
import { FolisharePageComponent } from './products/folishare-page.component';
import { GetquinPageComponent } from './products/getquin-page.component';
import { GoSpatzPageComponent } from './products/gospatz-page.component';
import { IntuitMintPageComponent } from './products/intuit-mint-page.component';
import { JustEtfPageComponent } from './products/justetf-page.component';
import { KuberaPageComponent } from './products/kubera-page.component';
import { MagnifiPageComponent } from './products/magnifi-page.component';
import { MarketsShPageComponent } from './products/markets.sh-page.component';
import { MaybeFinancePageComponent } from './products/maybe-finance-page.component';
import { MonarchMoneyPageComponent } from './products/monarch-money-page.component';
import { MonsePageComponent } from './products/monse-page.component';
import { ParqetPageComponent } from './products/parqet-page.component';
import { PlannixPageComponent } from './products/plannix-page.component';
import { PortfolioDividendTrackerPageComponent } from './products/portfolio-dividend-tracker-page.component';
import { PortseidoPageComponent } from './products/portseido-page.component';
import { ProjectionLabPageComponent } from './products/projectionlab-page.component';
import { RocketMoneyPageComponent } from './products/rocket-money-page.component';
import { SeekingAlphaPageComponent } from './products/seeking-alpha-page.component';
import { SharesightPageComponent } from './products/sharesight-page.component';
import { SimplePortfolioPageComponent } from './products/simple-portfolio-page.component';
import { SnowballAnalyticsPageComponent } from './products/snowball-analytics-page.component';
import { StocklePageComponent } from './products/stockle-page.component';
import { StockMarketEyePageComponent } from './products/stockmarketeye-page.component';
import { SumioPageComponent } from './products/sumio-page.component';
import { TillerPageComponent } from './products/tiller-page.component';
import { UtlunaPageComponent } from './products/utluna-page.component';
import { VyzerPageComponent } from './products/vyzer-page.component';
import { WealthfolioPageComponent } from './products/wealthfolio-page.component';
import { WealthicaPageComponent } from './products/wealthica-page.component';
import { WhalPageComponent } from './products/whal-page.component';
import { YeekateePageComponent } from './products/yeekatee-page.component';
import { YnabPageComponent } from './products/ynab-page.component';

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
    region: $localize`Global`,
    slogan: 'Open Source Wealth Management',
    useAnonymously: true
  },
  {
    component: AllInvestViewPageComponent,
    founded: 2023,
    hasSelfHostingAbility: false,
    key: 'allinvestview',
    languages: ['English'],
    name: 'AllInvestView',
    slogan: 'All your Investments in One View'
  },
  {
    component: AllvueSystemsPageComponent,
    founded: 2019,
    hasFreePlan: false,
    hasSelfHostingAbility: false,
    key: 'allvue-systems',
    name: 'Allvue Systems',
    origin: $localize`United States`,
    slogan: 'Investment Software Suite'
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
    component: BasilFinancePageComponent,
    founded: 2022,
    hasFreePlan: true,
    hasSelfHostingAbility: false,
    key: 'basil-finance',
    name: 'Basil Finance',
    slogan: 'The ultimate solution for tracking and managing your investments'
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
    component: CapitallyPageComponent,
    hasFreePlan: true,
    hasSelfHostingAbility: false,
    key: 'capitally',
    name: 'Capitally',
    origin: $localize`Poland`,
    pricingPerYear: '€50',
    slogan: 'Optimize your investments performance'
  },
  {
    component: CapMonPageComponent,
    founded: 2022,
    key: 'capmon',
    name: 'CapMon.org',
    origin: $localize`Germany`,
    note: 'CapMon.org has discontinued in 2023',
    slogan: 'Next Generation Assets Tracking'
  },
  {
    component: CompoundPlanningPageComponent,
    founded: 2019,
    key: 'compound-planning',
    name: 'Compound Planning',
    origin: $localize`United States`,
    slogan: 'Modern Wealth & Investment Management'
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
    component: DeFiPageComponent,
    founded: 2020,
    key: 'de.fi',
    languages: ['English'],
    name: 'De.Fi',
    slogan: 'DeFi Portfolio Tracker'
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
    component: EmpowerPageComponent,
    founded: 2009,
    hasSelfHostingAbility: false,
    key: 'empower',
    name: 'Empower',
    note: 'Originally named as Personal Capital',
    origin: $localize`United States`,
    slogan: 'Get answers to your money questions'
  },
  {
    alias: '8figures',
    component: EightFiguresPageComponent,
    founded: 2022,
    key: 'eightfigures',
    name: '8FIGURES',
    origin: $localize`United States`,
    slogan: 'Portfolio Tracker Designed by Professional Investors'
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
    component: FinaPageComponent,
    founded: 2023,
    hasFreePlan: true,
    hasSelfHostingAbility: false,
    key: 'fina',
    languages: ['English'],
    name: 'Fina',
    origin: $localize`United States`,
    pricingPerYear: '$115',
    slogan: 'Flexible Financial Management'
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
    component: FinWisePageComponent,
    founded: 2023,
    hasFreePlan: true,
    key: 'finwise',
    name: 'FinWise',
    origin: $localize`South Africa`,
    pricingPerYear: '€69.99',
    slogan: 'Personal finances, simplified'
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
    component: IntuitMintPageComponent,
    hasFreePlan: true,
    hasSelfHostingAbility: false,
    key: 'intuit-mint',
    name: 'Intuit Mint',
    note: 'Intuit Mint has discontinued in 2023',
    origin: $localize`United States`,
    pricingPerYear: '$60',
    slogan: 'Managing money, made simple'
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
    component: MagnifiPageComponent,
    founded: 2018,
    hasFreePlan: false,
    hasSelfHostingAbility: false,
    key: 'magnifi',
    name: 'Magnifi',
    origin: $localize`United States`,
    pricingPerYear: '$132',
    slogan: 'AI Investing Assistant'
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
    note: 'Maybe Finance has discontinued in 2023',
    origin: $localize`United States`,
    pricingPerYear: '$145',
    region: $localize`United States`,
    slogan: 'Your financial future, in your control'
  },
  {
    component: MonarchMoneyPageComponent,
    founded: 2019,
    hasFreePlan: false,
    hasSelfHostingAbility: false,
    key: 'monarch-money',
    name: 'Monarch Money',
    origin: $localize`United States`,
    pricingPerYear: '$99.99',
    slogan: 'The modern way to manage your money'
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
    component: RocketMoneyPageComponent,
    founded: 2015,
    hasSelfHostingAbility: false,
    key: 'rocket-money',
    name: 'Rocket Money',
    origin: $localize`United States`,
    slogan: 'Track your net worth'
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
    note: 'StockMarketEye has discontinued in 2023',
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
    component: TillerPageComponent,
    founded: 2016,
    hasFreePlan: false,
    key: 'tiller',
    name: 'Tiller',
    origin: $localize`United States`,
    pricingPerYear: '$79',
    slogan:
      'Your financial life in a spreadsheet, automatically updated each day'
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
    component: VyzerPageComponent,
    founded: 2020,
    hasFreePlan: true,
    key: 'vyzer',
    name: 'Vyzer',
    origin: $localize`United States`,
    pricingPerYear: '$348',
    slogan: 'Virtual Family Office for Smart Wealth Management'
  },
  {
    component: WealthfolioPageComponent,
    hasSelfHostingAbility: true,
    key: 'wealthfolio',
    languages: ['English'],
    name: 'Wealthfolio',
    slogan: 'Desktop Investment Tracker'
  },
  {
    component: WealthicaPageComponent,
    founded: 2015,
    hasFreePlan: true,
    hasSelfHostingAbility: false,
    key: 'wealthica',
    languages: ['English', 'Français'],
    name: 'Wealthica',
    origin: $localize`Canada`,
    pricingPerYear: '$50',
    slogan: 'See all your investments in one place'
  },
  {
    component: WhalPageComponent,
    key: 'whal',
    name: 'Whal',
    origin: $localize`United States`,
    slogan: 'Manage your investments in one place'
  },
  {
    component: YeekateePageComponent,
    founded: 2021,
    hasFreePlan: true,
    hasSelfHostingAbility: false,
    key: 'yeekatee',
    languages: ['Deutsch', 'English', 'Español', 'Français', 'Italiano'],
    name: 'yeekatee',
    origin: $localize`Switzerland`,
    region: $localize`Global`,
    slogan: 'Connect. Share. Invest.'
  },
  {
    component: YnabPageComponent,
    founded: 2004,
    hasFreePlan: false,
    hasSelfHostingAbility: false,
    key: 'ynab',
    name: 'YNAB (You Need a Budget)',
    origin: $localize`United States`,
    pricingPerYear: '$99',
    slogan: 'Change Your Relationship With Money'
  }
];
