import { ConfirmationDialogType } from '../confirmation-dialog.type';

export interface IConfirmDialogParams {
  confirmLabel?: string;
  confirmType: ConfirmationDialogType;
  discardLabel?: string;
  message?: string;
  title: string;
}
