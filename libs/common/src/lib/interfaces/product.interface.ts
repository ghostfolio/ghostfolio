import { ProductCategory, ProductPlatform } from '@ghostfolio/common/types';

export interface Product {
  alias?: string;
  categories?: ProductCategory[];
  founded?: number;
  hasFreePlan?: boolean;
  hasSelfHostingAbility?: boolean;
  isArchived?: boolean;
  isOpenSource?: boolean;
  key: string;
  languages?: string[];
  name: string;
  note?: string;
  origin?: string;
  platforms?: ProductPlatform[];
  pricingPerYear?: string;
  regions?: string[];
  slogan?: string;
  url?: string;
  useAnonymously?: boolean;
}
