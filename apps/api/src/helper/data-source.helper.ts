import { DataSource } from '@prisma/client';

export function getMaskedGhostfolioDataSource({
  dataSource,
  ghostfolioDataSources
}: {
  dataSource: DataSource;
  ghostfolioDataSources: string[];
}) {
  return ghostfolioDataSources.includes(dataSource)
    ? DataSource.GHOSTFOLIO
    : dataSource;
}
