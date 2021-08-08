import { Country } from '@ghostfolio/common/interfaces/country.interface';
import { Sector } from '@ghostfolio/common/interfaces/sector.interface';
import { AssetClass, Currency, DataSource } from '@prisma/client';

export interface EnhancedSymbolProfile {
  assetClass: AssetClass;
  createdAt: Date;
  currency: Currency | null;
  dataSource: DataSource;
  id: string;
  name: string | null;
  updatedAt: Date;
  symbol: string;
  countries: Country[];
  sectors: Sector[];
}
