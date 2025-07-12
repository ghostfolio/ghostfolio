import { AccountClusterRiskCurrentInvestment } from '@ghostfolio/api/models/rules/account-cluster-risk/current-investment';
import { AccountClusterRiskSingleAccount } from '@ghostfolio/api/models/rules/account-cluster-risk/single-account';
import { AssetClassClusterRiskEquity } from '@ghostfolio/api/models/rules/asset-class-cluster-risk/equity';
import { AssetClassClusterRiskFixedIncome } from '@ghostfolio/api/models/rules/asset-class-cluster-risk/fixed-income';
import { CurrencyClusterRiskBaseCurrencyCurrentInvestment } from '@ghostfolio/api/models/rules/currency-cluster-risk/base-currency-current-investment';
import { CurrencyClusterRiskCurrentInvestment } from '@ghostfolio/api/models/rules/currency-cluster-risk/current-investment';
import { EconomicMarketClusterRiskDevelopedMarkets } from '@ghostfolio/api/models/rules/economic-market-cluster-risk/developed-markets';
import { EconomicMarketClusterRiskEmergingMarkets } from '@ghostfolio/api/models/rules/economic-market-cluster-risk/emerging-markets';
import { EmergencyFundSetup } from '@ghostfolio/api/models/rules/emergency-fund/emergency-fund-setup';
import { FeeRatioInitialInvestment } from '@ghostfolio/api/models/rules/fees/fee-ratio-initial-investment';
import { RegionalMarketClusterRiskAsiaPacific } from '@ghostfolio/api/models/rules/regional-market-cluster-risk/asia-pacific';
import { RegionalMarketClusterRiskEmergingMarkets } from '@ghostfolio/api/models/rules/regional-market-cluster-risk/emerging-markets';
import { RegionalMarketClusterRiskEurope } from '@ghostfolio/api/models/rules/regional-market-cluster-risk/europe';
import { RegionalMarketClusterRiskJapan } from '@ghostfolio/api/models/rules/regional-market-cluster-risk/japan';
import { RegionalMarketClusterRiskNorthAmerica } from '@ghostfolio/api/models/rules/regional-market-cluster-risk/north-america';

export const RULE_CATEGORY_MAPPING = {
  // Account Cluster Risk Rules
  [AccountClusterRiskCurrentInvestment.name]: 'Account Cluster Risk',
  [AccountClusterRiskSingleAccount.name]: 'Account Cluster Risk',

  // Asset Class Cluster Risk Rules
  [AssetClassClusterRiskEquity.name]: 'Asset Class Cluster Risk',
  [AssetClassClusterRiskFixedIncome.name]: 'Asset Class Cluster Risk',

  // Currency Cluster Risk Rules
  [CurrencyClusterRiskBaseCurrencyCurrentInvestment.name]:
    'Currency Cluster Risk',
  [CurrencyClusterRiskCurrentInvestment.name]: 'Currency Cluster Risk',

  // Economic Market Cluster Risk Rules
  [EconomicMarketClusterRiskDevelopedMarkets.name]:
    'Economic Market Cluster Risk',
  [EconomicMarketClusterRiskEmergingMarkets.name]:
    'Economic Market Cluster Risk',

  // Emergency Fund Rules
  [EmergencyFundSetup.name]: 'Emergency Fund',

  // Fee Rules
  [FeeRatioInitialInvestment.name]: 'Fees',

  // Regional Market Cluster Risk Rules
  [RegionalMarketClusterRiskAsiaPacific.name]: 'Regional Market Cluster Risk',
  [RegionalMarketClusterRiskEmergingMarkets.name]:
    'Regional Market Cluster Risk',
  [RegionalMarketClusterRiskEurope.name]: 'Regional Market Cluster Risk',
  [RegionalMarketClusterRiskJapan.name]: 'Regional Market Cluster Risk',
  [RegionalMarketClusterRiskNorthAmerica.name]: 'Regional Market Cluster Risk'
} as const;

export type RuleCategoryName =
  (typeof RULE_CATEGORY_MAPPING)[keyof typeof RULE_CATEGORY_MAPPING];
