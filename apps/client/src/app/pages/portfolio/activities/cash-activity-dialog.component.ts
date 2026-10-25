import { GfCashManagementComponent } from '@ghostfolio/client/components/cash-management/cash-management.component';
import { User } from '@ghostfolio/common/interfaces';

import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';

@Component({
  selector: 'gf-cash-activity-dialog',
  imports: [
    GfCashManagementComponent,
    MatDialogModule,
    MatButtonModule,
    MatSelectModule
  ],
  template: `
    <h2 i18n mat-dialog-title>Cash transaction</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" class="w-100">
        <mat-label i18n>Account</mat-label>
        <mat-select
          [disabled]="!!data.eventId"
          [value]="accountId()"
          (selectionChange)="accountId.set($event.value)"
        >
          @for (account of accounts; track account.id) {
            <mat-option [value]="account.id">{{ account.name }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      @if (accountId()) {
        <gf-cash-management
          [accountId]="accountId()"
          [canWrite]="true"
          [currency]="currency()"
          [eventId]="data.eventId"
        />
      } @else {
        <p i18n>Create an account before inserting a cash transaction.</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end"
      ><button i18n mat-button mat-dialog-close>
        Close
      </button></mat-dialog-actions
    >
  `
})
export class GfCashActivityDialogComponent {
  protected readonly data = inject<{
    user: User;
    accountId?: string;
    eventId?: string;
  }>(MAT_DIALOG_DATA);
  protected readonly accounts = this.data.user.accounts.filter(
    (account) => !!account.currency
  );
  protected readonly accountId = signal(
    this.data.accountId ?? this.accounts[0]?.id ?? ''
  );
  protected readonly currency = computed(
    () =>
      this.accounts.find((account) => account.id === this.accountId())?.currency
  );
}
