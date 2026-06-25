import { DataSource } from '@prisma/client';
import { createHash } from 'node:crypto';

const decodedDataSourceMap: Record<string, DataSource> = Object.values(
  DataSource
).reduce((map, dataSource) => {
  map[encodeDataSource(dataSource)] = dataSource;

  return map;
}, {});

export function encodeDataSource(aDataSource: DataSource) {
  if (!aDataSource) {
    return undefined;
  }

  return createHash('sha256').update(aDataSource).digest('hex').slice(0, 8);
}

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

export function decodeDataSource(encodedDataSource: string) {
  return encodedDataSource
    ? decodedDataSourceMap[encodedDataSource]
    : undefined;
}
