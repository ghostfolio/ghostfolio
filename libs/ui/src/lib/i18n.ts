import '@angular/localize/init';

const locales = {
  ACCOUNT: $localize`Account`,
  ASSET_CLASS: $localize`Asset class`,
  SYMBOL: $localize`Symbol`,
  TAG: $localize`Tag`,

  // enum AssetClass
  CASH: $localize`Cash`,
  COMMODITY: $localize`Commodity`,
  EQUITY: $localize`Equity`,
  FIXED_INCOME: $localize`Fixed income`,
  REAL_ESTATE: $localize`Real estate`,

  // enum AssetSubClass
  BOND: $localize`Bond`,
  CRYPTOCURRENCY: $localize`Cryptocurrency`,
  ETF: $localize`ETF`,
  MUTUALFUND: $localize`Mutual fund`,
  PRECIOUS_METAL: $localize`Precious metal`,
  PRIVATE_EQUITY: $localize`Private equity`,
  STOCK: $localize`Stock`
};

export function translate(aKey: string) {
  return locales[aKey] ?? aKey;
}
