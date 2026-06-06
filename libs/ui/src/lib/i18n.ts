import type { SectorName } from '@ghostfolio/common/types';

import '@angular/localize/init';

const locales = {
  ACCOUNT: $localize`Account`,
  'Asia-Pacific': $localize`Asia-Pacific`,
  ASSET_CLASS: $localize`Asset Class`,
  ASSET_SUB_CLASS: $localize`Asset Sub Class`,
  BUY_AND_SELL_ACTIVITIES_TOOLTIP: $localize`Buy and sell`,
  CANCEL: $localize`Cancel`,
  CORE: $localize`Core`,
  CLOSE: $localize`Close`,
  DATA_IMPORT_AND_EXPORT_TOOLTIP_BASIC: $localize`Switch to Ghostfolio Premium or Ghostfolio Open Source easily`,
  DATA_IMPORT_AND_EXPORT_TOOLTIP_OSS: $localize`Switch to Ghostfolio Premium easily`,
  DATA_SOURCE: $localize`Data Source`,
  EMERGENCY_FUND: $localize`Emergency Fund`,
  EXCLUDE_FROM_ANALYSIS: $localize`Exclude from Analysis`,
  Global: $localize`Global`,
  GRANT: $localize`Grant`,
  HIGHER_RISK: $localize`Higher Risk`,
  IMPORT_ACTIVITY_ERROR_IS_DUPLICATE: $localize`This activity already exists.`,
  LOWER_RISK: $localize`Lower Risk`,
  MONTH: $localize`Month`,
  MONTHS: $localize`Months`,
  OTHER: $localize`Other`,
  PROFESSIONAL_DATA_PROVIDER_TOOLTIP_PREMIUM: $localize`Get access to 80’000+ tickers from over 50 exchanges`,
  PRESET_ID: $localize`Preset`,
  RETIREMENT_PROVISION: $localize`Retirement Provision`,
  SATELLITE: $localize`Satellite`,
  SYMBOL: $localize`Symbol`,
  TAG: $localize`Tag`,
  YEAR: $localize`Year`,
  YEARS: $localize`Years`,
  YES: $localize`Yes`,

  // Activity types
  BUY: $localize`Buy`,
  DIVIDEND: $localize`Dividend`,
  FEE: $localize`Fee`,
  INTEREST: $localize`Interest`,
  LIABILITY: $localize`Liability`,
  SELL: $localize`Sell`,
  VALUABLE: $localize`Valuable`,

  // AssetClass (enum)
  ALTERNATIVE_INVESTMENT: $localize`Alternative Investment`,
  COMMODITY: $localize`Commodity`,
  EQUITY: $localize`Equity`,
  FIXED_INCOME: $localize`Fixed Income`,
  LIQUIDITY: $localize`Liquidity`,
  REAL_ESTATE: $localize`Real Estate`,

  // AssetSubClass (enum)
  BOND: $localize`Bond`,
  CASH: $localize`Cash`,
  COLLECTIBLE: $localize`Collectible`,
  CRYPTOCURRENCY: $localize`Cryptocurrency`,
  ETF: $localize`ETF`,
  LOAN: $localize`Loan`,
  MUTUALFUND: $localize`Mutual Fund`,
  PRECIOUS_METAL: $localize`Precious Metal`,
  PRIVATE_EQUITY: $localize`Private Equity`,
  STOCK: $localize`Stock`,

  // Benchmark
  ALL_TIME_HIGH: 'All time high',
  BEAR_MARKET: 'Bear market',

  // Continents
  Africa: $localize`Africa`,
  Asia: $localize`Asia`,
  Europe: $localize`Europe`,
  'North America': $localize`North America`,
  Oceania: $localize`Oceania`,
  'South America': $localize`South America`,

  // Fear and Greed Index
  EXTREME_FEAR: $localize`Extreme Fear`,
  EXTREME_GREED: $localize`Extreme Greed`,
  FEAR: $localize`Fear`,
  GREED: $localize`Greed`,
  NEUTRAL: $localize`Neutral`,

  // Sectors
  'Basic Materials': $localize`Basic Materials`,
  'Communication Services': $localize`Communication Services`,
  'Consumer Cyclical': $localize`Consumer Cyclical`,
  'Consumer Defensive': $localize`Consumer Defensive`,
  Energy: $localize`Energy`,
  'Financial Services': $localize`Financial Services`,
  Healthcare: $localize`Healthcare`,
  Industrials: $localize`Industrials`,
  Other: $localize`Other`,
  'Real Estate': $localize`Real Estate`,
  Technology: $localize`Technology`,
  Utilities: $localize`Utilities`
} satisfies Record<SectorName, string> & Record<string, string>;

export function translate(aKey: string): string {
  return locales[aKey] ?? aKey;
}
