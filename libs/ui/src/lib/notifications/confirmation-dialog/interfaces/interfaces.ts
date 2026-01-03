import { ConfirmationDialogType } from '@ghostfolio/common/enums';

export interface ConfirmDialogParams {
  confirmLabel?: string;
  confirmType: ConfirmationDialogType;
  discardLabel?: string;
  message?: string;
  title: string;
}
