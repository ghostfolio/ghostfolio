import { Sector } from '@ghostfolio/common/interfaces/sector.interface';
import { Country } from '@ghostfolio/common/interfaces/country.interface';
import { Currency, DataSource } from '@prisma/client';

export interface EnhancedSymbolProfile {
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
