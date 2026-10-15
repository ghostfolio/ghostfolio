import type { ColumnDescriptor } from 'tablemark';

export interface TableColumnDefinition<T, C = void> extends ColumnDescriptor {
  getValue: (item: T, context: C) => string;
  name: string;
}
