import { Filter } from './filter.interface';

export interface FilterGroup {
  filters: Filter[];
  name: Filter['type'];
}
