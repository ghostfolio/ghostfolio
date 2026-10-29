import type { PlatformResponse } from './platform-response.interface';

export interface PlatformsResponse {
  platforms: (PlatformResponse & { accountCount?: number })[];
}
