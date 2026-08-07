import { AssetProfileItem } from '../asset-profile-item.interface';

export interface AssetProfilesResponse {
  assetProfiles: AssetProfileItem[];
  count: number;
}
