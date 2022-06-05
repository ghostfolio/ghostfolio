import { AssetClass, AssetSubClass, DataSource } from '@prisma/client';

import { Country } from './country.interface';
import { ScraperConfiguration } from './scraper-configuration.interface';
import { Sector } from './sector.interface';

export interface EnhancedSymbolProfile {
  assetClass: AssetClass;
  assetSubClass: AssetSubClass;
  countries: Country[];
  createdAt: Date;
  currency: string | null;
  dataSource: DataSource;
  id: string;
  name: string | null;
  scraperConfiguration?: ScraperConfiguration | null;
  sectors: Sector[];
  symbol: string;
  symbolMapping?: { [key: string]: string };
  updatedAt: Date;
}
