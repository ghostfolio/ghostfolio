import type { FormControl, FormGroup } from '@angular/forms';
import type { SymbolProfile } from '@prisma/client';

export interface CreateWatchlistItemDialogParams {
  deviceType: string;
  locale: string;
}

export type CreateWatchlistItemForm = FormGroup<{
  searchSymbol: FormControl<SymbolProfile | null>;
}>;
