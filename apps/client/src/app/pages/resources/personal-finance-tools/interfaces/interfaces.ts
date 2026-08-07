import type { Product } from '@ghostfolio/common/interfaces';

export type ResolvedProduct = Omit<Product, 'categories' | 'platforms'> & {
  categories?: string[];
  platforms?: string[];
};
