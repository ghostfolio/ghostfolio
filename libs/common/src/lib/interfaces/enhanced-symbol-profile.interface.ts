import { AssetClass, AssetSubClass, DataSource, Tag } from '@prisma/client';

import { Country } from './country.interface';
import { DataProviderInfo } from './data-provider-info.interface';
import { Holding } from './holding.interface';
import { ScraperConfiguration } from './scraper-configuration.interface';
import { Sector } from './sector.interface';

export interface EnhancedSymbolProfile {
  activitiesCount: number;
  assetClass: AssetClass;
  assetSubClass: AssetSubClass;
  comment?: string;
  countries: Country[];
  createdAt: Date;
  currency?: string;
  dataProviderInfo?: DataProviderInfo;
  dataSource: DataSource;
  dateOfFirstActivity?: Date;
  figi?: string;
  figiComposite?: string;
  figiShareClass?: string;
  holdings: Holding[];
  id: string;
  isin?: string;
  name?: string;
  scraperConfiguration?: ScraperConfiguration;
  sectors: Sector[];
  symbol: string;
  symbolMapping?: { [key: string]: string };
  updatedAt: Date;
  url?: string;
  tags?: Tag[];
  userId?: string;
}
