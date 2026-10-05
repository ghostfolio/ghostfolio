import type {
  AssetClass,
  AssetSubClass,
  DataGatheringFrequency,
  DataSource
} from '@ghostfolio/prisma/enums';

import type { Country } from './country.interface';
import type { DataProviderInfo } from './data-provider-info.interface';
import type { Holding } from './holding.interface';
import type { ScraperConfiguration } from './scraper-configuration.interface';
import type { Sector } from './sector.interface';

export interface EnhancedAssetProfile {
  activitiesCount: number;
  assetClass: AssetClass;
  assetSubClass: AssetSubClass;
  comment?: string;
  countries: Country[];
  createdAt: Date;
  currency?: string;
  cusip?: string;
  dataGatheringFrequency?: DataGatheringFrequency;
  dataProviderInfo?: DataProviderInfo;
  dataSource: DataSource;
  dateOfFirstActivity?: Date;
  figi?: string;
  figiComposite?: string;
  figiShareClass?: string;
  holdings: Holding[];
  id: string;
  isActive: boolean;
  isin?: string;
  name?: string;
  scraperConfiguration?: ScraperConfiguration;
  sectors: Sector[];
  symbol: string;
  symbolMapping?: { [key: string]: string };
  updatedAt: Date;
  url?: string;
  userId?: string;
  watchedByCount?: number;
}
