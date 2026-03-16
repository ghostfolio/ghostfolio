import { CreateEntityDto } from '@ghostfolio/common/dtos';

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
  selector: 'gf-create-entity-dialog',
  standalone: true,
  template: `
    <h2 mat-dialog-title>Create Entity</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" style="width: 100%">
        <mat-label>Name</mat-label>
        <input matInput required [(ngModel)]="name" />
      </mat-form-field>

      <mat-form-field appearance="outline" style="width: 100%">
        <mat-label>Type</mat-label>
        <mat-select required [(ngModel)]="type">
          <mat-option value="INDIVIDUAL">Individual</mat-option>
          <mat-option value="TRUST">Trust</mat-option>
          <mat-option value="LLC">LLC</mat-option>
          <mat-option value="LP">LP</mat-option>
          <mat-option value="CORPORATION">Corporation</mat-option>
          <mat-option value="FOUNDATION">Foundation</mat-option>
          <mat-option value="ESTATE">Estate</mat-option>
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="outline" style="width: 100%">
        <mat-label>Tax ID (optional)</mat-label>
        <input matInput [(ngModel)]="taxId" />
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button
        color="primary"
        mat-flat-button
        [disabled]="!name || !type"
        (click)="onSave()"
      >
        Create
      </button>
    </mat-dialog-actions>
  `
})
export class GfCreateEntityDialogComponent {
  public name = '';
  public taxId = '';
  public type = '';

  public constructor(
    private dialogRef: MatDialogRef<GfCreateEntityDialogComponent>
  ) {}

  public onSave() {
    const dto: CreateEntityDto = {
      name: this.name,
      type: this.type as any
    };

    if (this.taxId) {
      dto.taxId = this.taxId;
    }

    this.dialogRef.close(dto);
  }
}
