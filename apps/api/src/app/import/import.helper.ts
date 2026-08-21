import { getAssetProfileIdentifier } from '@ghostfolio/common/helper';
import { Activity } from '@ghostfolio/common/interfaces';

import { AssetProfileToCreate } from './interfaces/asset-profile-to-create.interface';

/**
 * Returns the asset profiles which at least one activity of the import uses.
 * The asset profiles are created after the validation of the activities,
 * thus an asset profile of an activity which is not imported must not be
 * created.
 */
export function getAssetProfilesToCreate({
  activities,
  assetProfiles
}: {
  activities: Pick<Activity, 'assetProfile' | 'error'>[];
  assetProfiles: AssetProfileToCreate[];
}) {
  const assetProfileIdentifiersToImport = new Set(
    activities
      .filter(({ error }) => {
        return !error;
      })
      .map(({ assetProfile }) => {
        return getAssetProfileIdentifier(assetProfile);
      })
  );

  return assetProfiles.filter(({ assetProfile }) => {
    return assetProfileIdentifiersToImport.has(
      getAssetProfileIdentifier(assetProfile)
    );
  });
}
