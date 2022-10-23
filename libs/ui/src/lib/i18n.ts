import '@angular/localize/init';

const locales = {
  ACCOUNT: $localize`Account`,
  ASSET_CLASS: $localize`Asset Class`,
  EMERGENCY_FUND: $localize`Emergency Fund`,
  OTHER: $localize`Other`,
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

export function translate(aKey: string) {
  return locales[aKey] ?? aKey;
}
