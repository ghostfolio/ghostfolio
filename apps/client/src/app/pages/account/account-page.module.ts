import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { GfPortfolioAccessTableModule } from '@ghostfolio/client/components/access-table/access-table.module';
import { AccountPageRoutingModule } from './account-page-routing.module';
import { AccountPageComponent } from './account-page.component';
import { MatInputModule } from '@angular/material/input';
import { MatDialogModule } from '@angular/material/dialog';

@NgModule({
  declarations: [AccountPageComponent],
  exports: [],
  imports: [
    AccountPageRoutingModule,
    CommonModule,
    FormsModule,
    GfPortfolioAccessTableModule,
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule
  ],
  providers: []
})
export class AccountPageModule {}
