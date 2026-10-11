import type {
  CreateAssetProfileWithMarketDataDto,
  CreateOrderDto
} from '@ghostfolio/common/dtos';

import { AiActivityRow } from '../ai-activity-row.interface';

export interface AiActivitiesResponse {
  activities: CreateOrderDto[];
  assetProfiles: CreateAssetProfileWithMarketDataDto[];
  rowsWithoutMatch: AiActivityRow[];
}
