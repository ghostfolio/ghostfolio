import type { Product } from '@ghostfolio/common/interfaces';

export interface ResolvedRegion {
  emojiFlag?: string;
  name: string;
}

export type ResolvedProduct = Omit<
  Product,
  'categories' | 'origin' | 'platforms' | 'regions'
> & {
  categories?: string[];
  origin?: ResolvedRegion;
  platforms?: string[];
  regions?: ResolvedRegion[];
};
