import type { AssetProfileIdentifier } from '@ghostfolio/common/interfaces';

import type { FormControl, FormGroup } from '@angular/forms';

export interface CreateAssetProfileDialogParams {
  deviceType: string;
  locale: string;
}

export type CreateAssetProfileDialogMode = 'auto' | 'currency' | 'manual';

export type CreateAssetProfileForm = FormGroup<{
  addCurrency: FormControl<string | null>;
  addSymbol: FormControl<string | null>;
  searchSymbol: FormControl<AssetProfileIdentifier | null>;
}>;
