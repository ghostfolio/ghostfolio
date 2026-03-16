import { CommonModule, CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { MatTableModule } from '@angular/material/table';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, CurrencyPipe, MatTableModule],
  selector: 'gf-partnership-table',
  standalone: true,
  styles: [
    `
      :host {
        display: block;
      }

      table {
        width: 100%;
      }

      .text-right {
        text-align: right;
      }
    `
  ],
  template: `
    <table mat-table [dataSource]="members">
      <ng-container matColumnDef="entityName">
        <th *matHeaderCellDef mat-header-cell>Member</th>
        <td *matCellDef="let row" mat-cell>{{ row.entityName }}</td>
      </ng-container>

      <ng-container matColumnDef="classType">
        <th *matHeaderCellDef mat-header-cell>Class</th>
        <td *matCellDef="let row" mat-cell>{{ row.classType ?? '—' }}</td>
      </ng-container>

      <ng-container matColumnDef="ownershipPercent">
        <th *matHeaderCellDef class="text-right" mat-header-cell>
          Ownership %
        </th>
        <td *matCellDef="let row" class="text-right" mat-cell>
          {{ row.ownershipPercent }}%
        </td>
      </ng-container>

      <ng-container matColumnDef="capitalCommitment">
        <th *matHeaderCellDef class="text-right" mat-header-cell>Commitment</th>
        <td *matCellDef="let row" class="text-right" mat-cell>
          {{
            row.capitalCommitment !== null
              ? (row.capitalCommitment
                | currency: currency : 'symbol' : '1.0-0')
              : '—'
          }}
        </td>
      </ng-container>

      <ng-container matColumnDef="capitalContributed">
        <th *matHeaderCellDef class="text-right" mat-header-cell>
          Contributed
        </th>
        <td *matCellDef="let row" class="text-right" mat-cell>
          {{
            row.capitalContributed !== null
              ? (row.capitalContributed
                | currency: currency : 'symbol' : '1.0-0')
              : '—'
          }}
        </td>
      </ng-container>

      <ng-container matColumnDef="allocatedNav">
        <th *matHeaderCellDef class="text-right" mat-header-cell>
          Allocated NAV
        </th>
        <td *matCellDef="let row" class="text-right" mat-cell>
          {{
            row.allocatedNav !== null
              ? (row.allocatedNav | currency: currency : 'symbol' : '1.0-0')
              : '—'
          }}
        </td>
      </ng-container>

      <tr *matHeaderRowDef="displayedColumns" mat-header-row></tr>
      <tr *matRowDef="let row; columns: displayedColumns" mat-row></tr>
    </table>
  `
})
export class GfPartnershipTableComponent {
  @Input() currency = 'USD';
  @Input() members: any[] = [];

  public displayedColumns = [
    'entityName',
    'classType',
    'ownershipPercent',
    'capitalCommitment',
    'capitalContributed',
    'allocatedNav'
  ];
}
