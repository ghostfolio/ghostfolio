import { DataSource } from '@prisma/client';
import { createHash } from 'node:crypto';

const encodedDataSourceByDataSource = new Map<DataSource, string>(
  Object.values(DataSource).map((dataSource) => {
    return [dataSource, hashDataSource(dataSource)];
  })
);

const dataSourceByEncodedDataSource = new Map<string, DataSource>(
  [...encodedDataSourceByDataSource].map(([dataSource, encodedDataSource]) => {
    return [encodedDataSource, dataSource];
  })
);

/**
 * @deprecated Backward compatibility to support importing data that was
 * exported using the previous data source encoding
 */
const dataSourceByDeprecatedEncodedDataSource = new Map<string, DataSource>(
  Object.values(DataSource).map((dataSource) => {
    return [deprecatedHashDataSource(dataSource), dataSource];
  })
);

/**
 * @deprecated Backward compatibility (see above)
 */
function deprecatedHashDataSource(dataSource: DataSource) {
  return Buffer.from(dataSource, 'utf-8').toString('hex');
}

function hashDataSource(dataSource: DataSource) {
  return createHash('sha256').update(dataSource).digest('hex').slice(0, 8);
}

export function decodeDataSource(encodedDataSource: string) {
  if (!encodedDataSource) {
    return undefined;
  }

  return (
    dataSourceByEncodedDataSource.get(encodedDataSource) ??
    dataSourceByDeprecatedEncodedDataSource.get(encodedDataSource) ??
    encodedDataSource
  );
}

export function encodeDataSource(dataSource: DataSource) {
  if (!dataSource) {
    return undefined;
  }

  return encodedDataSourceByDataSource.get(dataSource);
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
