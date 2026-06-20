import { ConfirmationDialogType } from '@ghostfolio/common/enums';
import { translate } from '@ghostfolio/ui/i18n';

import { inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { isFunction } from 'lodash';

import { GfAlertDialogComponent } from './alert-dialog/alert-dialog.component';
import { GfConfirmationDialogComponent } from './confirmation-dialog/confirmation-dialog.component';
import {
  AlertParams,
  ConfirmParams,
  PromptParams
} from './interfaces/interfaces';
import { GfPromptDialogComponent } from './prompt-dialog/prompt-dialog.component';

@Injectable()
export class NotificationService {
  private dialogMaxWidth: string;
  private dialogWidth: string;

  private readonly matDialog = inject(MatDialog);

  public alert(aParams: AlertParams) {
    aParams.discardLabel ??= translate('CLOSE');

    const dialog = this.matDialog.open(GfAlertDialogComponent, {
      autoFocus: false,
      maxWidth: this.dialogMaxWidth,
      width: this.dialogWidth
    });

    dialog.componentInstance.initialize({
      discardLabel: aParams.discardLabel,
      message: aParams.message,
      title: aParams.title
    });

    return dialog.afterClosed().subscribe(() => {
      if (isFunction(aParams.discardFn)) {
        aParams.discardFn();
      }
    });
  }

  public confirm(aParams: ConfirmParams) {
    aParams.confirmLabel ??= translate('YES');
    aParams.discardLabel ??= translate('CANCEL');

    const dialog = this.matDialog.open(GfConfirmationDialogComponent, {
      autoFocus: false,
      disableClose: aParams.disableClose ?? false,
      maxWidth: this.dialogMaxWidth,
      width: this.dialogWidth
    });

    dialog.componentInstance.initialize({
      confirmLabel: aParams.confirmLabel,
      confirmType: aParams.confirmType ?? ConfirmationDialogType.Primary,
      discardLabel: aParams.discardLabel,
      message: aParams.message,
      title: aParams.title
    });

    return dialog.afterClosed().subscribe((result) => {
      if (result === 'confirm' && isFunction(aParams.confirmFn)) {
        aParams.confirmFn();
      } else if (result === 'discard' && isFunction(aParams.discardFn)) {
        aParams.discardFn();
      }
    });
  }

  public prompt(aParams: PromptParams) {
    aParams.confirmLabel ??= translate('OK');
    aParams.discardLabel ??= translate('CANCEL');

    const dialog = this.matDialog.open(GfPromptDialogComponent, {
      autoFocus: true,
      maxWidth: this.dialogMaxWidth,
      width: this.dialogWidth
    });

    dialog.componentInstance.initialize({
      confirmLabel: aParams.confirmLabel,
      defaultValue: aParams.defaultValue,
      discardLabel: aParams.discardLabel,
      title: aParams.title,
      valueLabel: aParams.valueLabel
    });

    return dialog.afterClosed().subscribe((result: string) => {
      if (result !== 'discard' && isFunction(aParams.confirmFn)) {
        aParams.confirmFn(result);
      }
    });
  }

  public setDialogMaxWidth(aDialogMaxWidth: string) {
    this.dialogMaxWidth = aDialogMaxWidth;
  }

  public setDialogWidth(aDialogWidth: string) {
    this.dialogWidth = aDialogWidth;
  }
}
