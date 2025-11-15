import { ConfirmationDialogType } from '@ghostfolio/common/enums';

export interface AlertParams {
  discardFn?: () => void;
  discardLabel?: string;
  message?: string;
  title: string;
}

export interface ConfirmParams {
  confirmFn: () => void;
  confirmLabel?: string;
  confirmType?: ConfirmationDialogType;
  disableClose?: boolean;
  discardFn?: () => void;
  discardLabel?: string;
  message?: string;
  title: string;
}

export interface PromptParams {
  confirmFn: (value: string) => void;
  confirmLabel?: string;
  defaultValue?: string;
  discardLabel?: string;
  title: string;
  valueLabel?: string;
}
