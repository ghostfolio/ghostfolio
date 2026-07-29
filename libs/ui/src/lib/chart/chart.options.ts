import { getTooltipOptions } from '@ghostfolio/common/chart-helper';
import { ColorScheme, GroupBy } from '@ghostfolio/common/types';

import type { TooltipOptions } from 'chart.js';

import './chart.registry';

export function getTimeSeriesTooltipOptions<T extends 'bar' | 'line'>({
  colorScheme,
  currency,
  groupBy,
  locale,
  unit
}: {
  colorScheme: ColorScheme;
  currency?: string;
  groupBy?: GroupBy;
  locale?: string;
  unit?: string;
}): Partial<TooltipOptions<T>> {
  return {
    ...getTooltipOptions<T>({ colorScheme, currency, groupBy, locale, unit }),
    mode: 'index',
    position: 'top',
    xAlign: 'center',
    yAlign: 'bottom'
  };
}
