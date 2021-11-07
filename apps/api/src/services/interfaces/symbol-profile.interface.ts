import { Country } from '@ghostfolio/common/interfaces/country.interface';
import { Sector } from '@ghostfolio/common/interfaces/sector.interface';
import { AssetClass, AssetSubClass, DataSource } from '@prisma/client';

export interface EnhancedSymbolProfile {
  assetClass: AssetClass;
  assetSubClass: AssetSubClass;
  countries: Country[];
  createdAt: Date;
  currency: string | null;
  dataSource: DataSource;
  id: string;
  name: string | null;
  sectors: Sector[];
  symbol: string;
  symbolMapping?: { [key: string]: string };
  updatedAt: Date;
}
