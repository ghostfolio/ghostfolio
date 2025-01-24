import { ConfirmationDialogType } from '../confirmation-dialog/confirmation-dialog.type';

export interface IAlertParams {
  discardFn?: () => void;
  discardLabel?: string;
  message?: string;
  title: string;
}

export interface IConfirmParams {
  confirmFn: () => void;
  confirmLabel?: string;
  confirmType?: ConfirmationDialogType;
  disableClose?: boolean;
  discardFn?: () => void;
  discardLabel?: string;
  message?: string;
  title: string;
}

export interface IPromptParams {
  confirmFn: (value: string) => void;
  confirmLabel?: string;
  defaultValue?: string;
  discardLabel?: string;
  title: string;
  valueLabel?: string;
}
