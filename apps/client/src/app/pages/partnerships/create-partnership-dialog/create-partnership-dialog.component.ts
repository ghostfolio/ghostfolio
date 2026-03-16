import { CreatePartnershipDto } from '@ghostfolio/common/dtos';

import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

@Component({
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule
  ],
  selector: 'gf-create-partnership-dialog',
  standalone: true,
  template: `
    <h2 mat-dialog-title>Create Partnership</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" style="width: 100%">
        <mat-label>Name</mat-label>
        <input matInput required [(ngModel)]="name" />
      </mat-form-field>

      <mat-form-field appearance="outline" style="width: 100%">
        <mat-label>Type</mat-label>
        <mat-select required [(ngModel)]="type">
          <mat-option value="LP">LP</mat-option>
          <mat-option value="GP">GP</mat-option>
          <mat-option value="LLC">LLC</mat-option>
          <mat-option value="JOINT_VENTURE">Joint Venture</mat-option>
          <mat-option value="FUND">Fund</mat-option>
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="outline" style="width: 100%">
        <mat-label>Inception Date</mat-label>
        <input matInput required type="date" [(ngModel)]="inceptionDate" />
      </mat-form-field>

      <mat-form-field appearance="outline" style="width: 100%">
        <mat-label>Currency</mat-label>
        <input matInput placeholder="USD" required [(ngModel)]="currency" />
      </mat-form-field>

      <mat-form-field appearance="outline" style="width: 100%">
        <mat-label>Fiscal Year End (Month)</mat-label>
        <mat-select [(ngModel)]="fiscalYearEnd">
          <mat-option [value]="1">January</mat-option>
          <mat-option [value]="2">February</mat-option>
          <mat-option [value]="3">March</mat-option>
          <mat-option [value]="4">April</mat-option>
          <mat-option [value]="5">May</mat-option>
          <mat-option [value]="6">June</mat-option>
          <mat-option [value]="7">July</mat-option>
          <mat-option [value]="8">August</mat-option>
          <mat-option [value]="9">September</mat-option>
          <mat-option [value]="10">October</mat-option>
          <mat-option [value]="11">November</mat-option>
          <mat-option [value]="12">December</mat-option>
        </mat-select>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button
        color="primary"
        mat-flat-button
        [disabled]="!name || !type || !inceptionDate || !currency"
        (click)="onSave()"
      >
        Create
      </button>
    </mat-dialog-actions>
  `
})
export class GfCreatePartnershipDialogComponent {
  public currency = 'USD';
  public fiscalYearEnd = 12;
  public inceptionDate = '';
  public name = '';
  public type = '';

  public constructor(
    private dialogRef: MatDialogRef<GfCreatePartnershipDialogComponent>
  ) {}

  public onSave() {
    const dto: CreatePartnershipDto = {
      name: this.name,
      type: this.type as any,
      inceptionDate: this.inceptionDate,
      currency: this.currency,
      fiscalYearEnd: this.fiscalYearEnd
    };

    this.dialogRef.close(dto);
  }
}
