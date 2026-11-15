import { TAG_ID_EXCLUDE_FROM_ANALYSIS } from '@ghostfolio/common/config';
import { getAssetProfileIdentifier } from '@ghostfolio/common/helper';
import { Filter, PortfolioPosition } from '@ghostfolio/common/interfaces';
import type { Tag } from '@ghostfolio/prisma/browser';
import { AssetClass, DataSource } from '@ghostfolio/prisma/enums';

import { translate } from '../i18n';
import { PortfolioFilterFormValue } from './interfaces';

export function getAssetClassFilters(): Filter[] {
  return Object.keys(AssetClass)
    .map((assetClass) => {
      return {
        id: assetClass,
        label: translate(assetClass),
        type: 'ASSET_CLASS'
      } satisfies Filter;
    })
    .sort((a, b) => {
      return a.label.localeCompare(b.label);
    });
}

export function getFiltersFromPortfolioFilterFormValue(
  value: PortfolioFilterFormValue | null,
  { includeEmpty = false }: { includeEmpty?: boolean } = {}
) {
  const getFiltersOfType = (
    ids: string[] | undefined,
    type: Filter['type']
  ) => {
    const filtersOfType = (ids ?? [])
      .filter((id) => {
        return !!id;
      })
      .map((id) => {
        return { id, type } satisfies Filter;
      });

    // An empty filter signals that the filter of this type has been reset
    if (filtersOfType.length === 0 && includeEmpty) {
      return [{ type, id: '' } satisfies Filter];
    }

    return filtersOfType;
  };

  const filters: Filter[] = [
    ...getFiltersOfType(value?.accounts, 'ACCOUNT'),
    ...getFiltersOfType(value?.assetClasses, 'ASSET_CLASS'),
    {
      id: value?.holding?.assetProfile?.dataSource ?? '',
      type: 'DATA_SOURCE'
    },
    {
      id: value?.holding?.assetProfile?.symbol ?? '',
      type: 'SYMBOL'
    },
    ...getFiltersOfType(value?.tags, 'TAG')
  ];

  return includeEmpty
    ? filters
    : filters.filter(({ id }) => {
        return !!id;
      });
}

export function getHoldingsForFilter(holdings: PortfolioPosition[] = []) {
  return holdings
    .filter(({ assetProfile }) => {
      return (
        assetProfile.assetSubClass &&
        !['CASH'].includes(assetProfile.assetSubClass)
      );
    })
    .sort((a, b) => {
      return (a.assetProfile.name ?? '').localeCompare(
        b.assetProfile.name ?? ''
      );
    });
}

export function getPortfolioFilterFormValue(
  filters: Filter[],
  holdings: PortfolioPosition[]
): PortfolioFilterFormValue {
  const getFilterId = (type: Filter['type']) => {
    return (
      filters?.find((filter) => {
        return filter.type === type;
      })?.id ?? null
    );
  };

  const getFilterIds = (type: Filter['type']) => {
    return (filters ?? [])
      .filter((filter) => {
        return filter.type === type && !!filter.id;
      })
      .map(({ id }) => {
        return id;
      });
  };

  const dataSource = getFilterId('DATA_SOURCE') as DataSource;
  const symbol = getFilterId('SYMBOL');

  const holding = holdings.find(({ assetProfile }) => {
    return (
      !!(dataSource && symbol) &&
      getAssetProfileIdentifier(assetProfile) ===
        getAssetProfileIdentifier({ dataSource, symbol })
    );
  });

  return {
    accounts: getFilterIds('ACCOUNT'),
    assetClasses: getFilterIds('ASSET_CLASS'),
    holding: holding ?? null,
    tags: getFilterIds('TAG')
  };
}

export function getTagFilters(
  tags: (Tag & { isUsed: boolean })[] = []
): Filter[] {
  return (
    tags
      ?.filter(({ id, isUsed }) => {
        return id !== TAG_ID_EXCLUDE_FROM_ANALYSIS && isUsed;
      })
      ?.map(({ id, name }) => {
        return {
          id,
          label: translate(name),
          type: 'TAG'
        } satisfies Filter;
      })
      ?.sort((a, b) => {
        return a.label.localeCompare(b.label);
      }) ?? []
  );
}
