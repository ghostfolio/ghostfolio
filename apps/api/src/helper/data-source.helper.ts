import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import type { Prisma } from '@ghostfolio/prisma/client';
import { DataSource } from '@ghostfolio/prisma/enums';

import { isEmpty } from 'lodash-es';
import { createHash } from 'node:crypto';

const DATA_SOURCES_WITHOUT_ENCODING: DataSource[] = [
  DataSource.GHOSTFOLIO,
  DataSource.MANUAL
];

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

function getGhostfolioDataSources({
  configurationService
}: {
  configurationService: ConfigurationService;
}) {
  return configurationService.get('ENABLE_FEATURE_SUBSCRIPTION')
    ? configurationService.get('DATA_SOURCES_GHOSTFOLIO_DATA_PROVIDER')
    : [];
}

function getUnmaskedGhostfolioDataSource({
  dataSource,
  ghostfolioDataSources
}: {
  dataSource?: DataSource;
  ghostfolioDataSources: string[];
}) {
  return dataSource === DataSource.GHOSTFOLIO && ghostfolioDataSources?.[0]
    ? (ghostfolioDataSources[0] as DataSource)
    : dataSource;
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

export function isDataGatheringSupported({
  dataSource,
  scraperConfiguration
}: {
  dataSource: DataSource;
  scraperConfiguration: Prisma.JsonValue;
}) {
  // An asset profile with the MANUAL data source supports data gathering only
  // with a scraper configuration
  return dataSource !== DataSource.MANUAL || !isEmpty(scraperConfiguration);
}

export function isDataSourceEncodedInResponse(dataSource: DataSource) {
  return !DATA_SOURCES_WITHOUT_ENCODING.includes(dataSource);
}

export function isValidEncodedDataSource(encodedDataSource: string) {
  return dataSourceByEncodedDataSource.has(encodedDataSource);
}

/**
 * Gives the data source of a request without a transformation: an encoded data
 * source is decoded, and the mask of the Ghostfolio data provider is resolved if
 * the subscription is enabled (see the TransformDataSourceInRequestInterceptor)
 */
export function transformDataSourceInRequest({
  configurationService,
  dataSource
}: {
  configurationService: ConfigurationService;
  dataSource?: string;
}) {
  if (Object.hasOwn(DataSource, dataSource)) {
    return getUnmaskedGhostfolioDataSource({
      dataSource: dataSource as DataSource,
      ghostfolioDataSources: getGhostfolioDataSources({ configurationService })
    });
  }

  return decodeDataSource(dataSource) as DataSource;
}

/**
 * Gives the data source as a response gives it to a user who is not an admin:
 * encoded if the subscription is enabled, except the data sources GHOSTFOLIO
 * and MANUAL (see the TransformDataSourceInResponseInterceptor)
 */
export function transformDataSourceInResponse({
  configurationService,
  dataSource
}: {
  configurationService: ConfigurationService;
  dataSource: DataSource;
}) {
  return configurationService.get('ENABLE_FEATURE_SUBSCRIPTION') &&
    isDataSourceEncodedInResponse(dataSource)
    ? encodeDataSource(dataSource)
    : dataSource;
}
