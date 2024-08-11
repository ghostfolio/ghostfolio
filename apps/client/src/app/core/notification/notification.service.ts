import { translate } from '@ghostfolio/ui/i18n';

import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { isFunction } from 'lodash';

import { GfAlertDialogComponent } from './alert-dialog/alert-dialog.component';
import { GfConfirmationDialogComponent } from './confirmation-dialog/confirmation-dialog.component';
import { ConfirmationDialogType } from './confirmation-dialog/confirmation-dialog.type';
import { IAlertParams, IConfirmParams } from './interfaces/interfaces';

@Injectable()
export class NotificationService {
  private dialogMaxWidth: string;
  private dialogWidth: string;

  public constructor(private matDialog: MatDialog) {}

  public alert(aParams: IAlertParams) {
    if (!aParams.discardLabel) {
      aParams.discardLabel = translate('CLOSE');
    }

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

    return dialog.afterClosed().subscribe((result) => {
      if (isFunction(aParams.discardFn)) {
        aParams.discardFn();
      }
    });
  }

  public confirm(aParams: IConfirmParams) {
    if (!aParams.confirmLabel) {
      aParams.confirmLabel = translate('YES');
    }

    if (!aParams.discardLabel) {
      aParams.discardLabel = translate('CANCEL');
    }

    const dialog = this.matDialog.open(GfConfirmationDialogComponent, {
      autoFocus: false,
      disableClose: aParams.disableClose || false,
      maxWidth: this.dialogMaxWidth,
      width: this.dialogWidth
    });

    dialog.componentInstance.initialize({
      confirmLabel: aParams.confirmLabel,
      confirmType: aParams.confirmType || ConfirmationDialogType.Primary,
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

  public setDialogMaxWidth(aDialogMaxWidth: string) {
    this.dialogMaxWidth = aDialogMaxWidth;
  }

  public setDialogWidth(aDialogWidth: string) {
    this.dialogWidth = aDialogWidth;
  }
}
