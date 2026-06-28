import { getAssetProfileIdentifier } from '@ghostfolio/common/helper';
import { Filter, PortfolioPosition } from '@ghostfolio/common/interfaces';

import { AssetClass, DataSource, Tag } from '@prisma/client';

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
  const filters: Filter[] = [
    {
      id: value?.account ?? '',
      type: 'ACCOUNT'
    },
    {
      id: value?.assetClass ?? '',
      type: 'ASSET_CLASS'
    },
    {
      id: value?.holding?.assetProfile?.dataSource ?? '',
      type: 'DATA_SOURCE'
    },
    {
      id: value?.holding?.assetProfile?.symbol ?? '',
      type: 'SYMBOL'
    },
    {
      id: value?.tag ?? '',
      type: 'TAG'
    }
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
    account: getFilterId('ACCOUNT'),
    assetClass: getFilterId('ASSET_CLASS'),
    holding: holding ?? null,
    tag: getFilterId('TAG')
  };
}

export function getTagFilters(
  tags: (Tag & { isUsed: boolean })[] = []
): Filter[] {
  return (
    tags
      ?.filter(({ isUsed }) => {
        return isUsed;
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
