import { TableColumnDefinition } from './table-column-definition.interface';

export interface TableParameters<T, C> {
  columnDefinitions: readonly TableColumnDefinition<T, C>[];
  context?: C;
  rows: readonly T[];
}
