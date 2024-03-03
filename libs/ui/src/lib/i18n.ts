import '@angular/localize/init';

const locales = {
  ACCOUNT: $localize`Account`,
  'Asia-Pacific': $localize`Asia-Pacific`,
  ASSET_CLASS: $localize`Asset Class`,
  ASSET_SUB_CLASS: $localize`Asset Sub Class`,
  CORE: $localize`Core`,
  DATA_IMPORT_AND_EXPORT_TOOLTIP_BASIC: $localize`Switch to Ghostfolio Premium or Ghostfolio Open Source easily`,
  DATA_IMPORT_AND_EXPORT_TOOLTIP_OSS: $localize`Switch to Ghostfolio Premium easily`,
  DATA_IMPORT_AND_EXPORT_TOOLTIP_PREMIUM: $localize`Switch to Ghostfolio Open Source or Ghostfolio Basic easily`,
  EMERGENCY_FUND: $localize`Emergency Fund`,
  GRANT: $localize`Grant`,
  HIGHER_RISK: $localize`Higher Risk`,
  IMPORT_ACTIVITY_ERROR_IS_DUPLICATE: $localize`This activity already exists.`,
  Japan: $localize`Japan`,
  LOWER_RISK: $localize`Lower Risk`,
  MONTH: $localize`Month`,
  MONTHS: $localize`Months`,
  OTHER: $localize`Other`,
  PRESET_ID: $localize`Preset`,
  RETIREMENT_PROVISION: $localize`Retirement Provision`,
  SATELLITE: $localize`Satellite`,
  SYMBOL: $localize`Symbol`,
  TAG: $localize`Tag`,
  YEAR: $localize`Year`,
  YEARS: $localize`Years`,

  // Activity types
  BUY: $localize`Buy`,
  DIVIDEND: $localize`Dividend`,
  FEE: $localize`Fee`,
  INTEREST: $localize`Interest`,
  ITEM: $localize`Valuable`,
  LIABILITY: $localize`Liability`,
  SELL: $localize`Sell`,

  // AssetClass (enum)
  CASH: $localize`Cash`,
  COMMODITY: $localize`Commodity`,
  EQUITY: $localize`Equity`,
  FIXED_INCOME: $localize`Fixed Income`,
  REAL_ESTATE: $localize`Real Estate`,

  // AssetSubClass (enum)
  BOND: $localize`Bond`,
  CRYPTOCURRENCY: $localize`Cryptocurrency`,
  ETF: $localize`ETF`,
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
  NEUTRAL: $localize`Neutral`
};

export function translate(aKey: string): string {
  return locales[aKey] ?? aKey;
}
