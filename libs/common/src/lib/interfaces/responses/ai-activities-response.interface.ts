import type { CreateOrderDto } from '@ghostfolio/common/dtos';

import { AiActivityRow } from '../ai-activity-row.interface';

export interface AiActivitiesResponse {
  activities: CreateOrderDto[];
  rowsWithoutMatch: AiActivityRow[];
}
