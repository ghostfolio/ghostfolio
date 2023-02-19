import '@angular/localize/init';

const locales = {
  ACCOUNT: $localize`Account`,
  ASSET_CLASS: $localize`Asset Class`,
  ASSET_SUB_CLASS: $localize`Asset Sub Class`,
  CORE: $localize`Core`,
  DATA_IMPORT_AND_EXPORT_TOOLTIP_BASIC: $localize`Switch to Ghostfolio Premium or Ghostfolio Open Source easily`,
  DATA_IMPORT_AND_EXPORT_TOOLTIP_OSS: $localize`Switch to Ghostfolio Premium easily`,
  DATA_IMPORT_AND_EXPORT_TOOLTIP_PREMIUM: $localize`Switch to Ghostfolio Open Source or Ghostfolio Basic easily`,
  EMERGENCY_FUND: $localize`Emergency Fund`,
  GRANT: $localize`Grant`,
  HIGHER_RISK: $localize`Higher Risk`,
  LOWER_RISK: $localize`Lower Risk`,
  OTHER: $localize`Other`,
  RETIREMENT_PROVISION: $localize`Retirement Provision`,
  SATELLITE: $localize`Satellite`,
  SECURITIES: $localize`Securities`,
  SYMBOL: $localize`Symbol`,
  TAG: $localize`Tag`,

  // enum AssetClass
  CASH: $localize`Cash`,
  COMMODITY: $localize`Commodity`,
  EQUITY: $localize`Equity`,
  FIXED_INCOME: $localize`Fixed Income`,
  REAL_ESTATE: $localize`Real Estate`,

  // enum AssetSubClass
  BOND: $localize`Bond`,
  CRYPTOCURRENCY: $localize`Cryptocurrency`,
  ETF: $localize`ETF`,
  MUTUALFUND: $localize`Mutual Fund`,
  PRECIOUS_METAL: $localize`Precious Metal`,
  PRIVATE_EQUITY: $localize`Private Equity`,
  STOCK: $localize`Stock`,

  // Continents
  Africa: $localize`Africa`,
  Asia: $localize`Asia`,
  Europe: $localize`Europe`,
  'North America': $localize`North America`,
  Oceania: $localize`Oceania`,
  'South America': $localize`South America`
};

export function translate(aKey: string): string {
  return locales[aKey] ?? aKey;
}
