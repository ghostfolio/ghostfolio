import { ConfirmationDialogType } from '../confirmation-dialog.type';

export interface ConfirmDialogParams {
  confirmLabel?: string;
  confirmType: ConfirmationDialogType;
  discardLabel?: string;
  message?: string;
  title: string;
}
