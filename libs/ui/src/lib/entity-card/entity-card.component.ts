import { IEntity } from '@ghostfolio/common/interfaces';

import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatButtonModule, MatCardModule, MatIconModule],
  selector: 'gf-entity-card',
  standalone: true,
  styles: [
    `
      :host {
        display: block;
      }

      .entity-card {
        cursor: pointer;
        transition: box-shadow 0.2s ease;
      }

      .entity-card:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      .entity-type-icon {
        font-size: 28px;
        height: 28px;
        width: 28px;
      }

      .stat {
        text-align: center;
      }

      .stat-value {
        font-size: 1.25rem;
        font-weight: 600;
      }

      .stat-label {
        font-size: 0.75rem;
        opacity: 0.7;
      }
    `
  ],
  template: `
    <mat-card class="entity-card" (click)="entityClicked.emit(entity)">
      <mat-card-header>
        <mat-icon class="entity-type-icon" mat-card-avatar>{{
          getEntityIcon(entity?.type)
        }}</mat-icon>
        <mat-card-title>{{ entity?.name }}</mat-card-title>
        <mat-card-subtitle>{{ entity?.type }}</mat-card-subtitle>
      </mat-card-header>
      <mat-card-content>
        <div
          style="display: flex; justify-content: space-around; margin-top: 16px"
        >
          <div class="stat">
            <div class="stat-value">{{ entity?.ownershipsCount ?? 0 }}</div>
            <div class="stat-label">Accounts</div>
          </div>
          <div class="stat">
            <div class="stat-value">{{ entity?.membershipsCount ?? 0 }}</div>
            <div class="stat-label">Partnerships</div>
          </div>
        </div>
      </mat-card-content>
    </mat-card>
  `
})
export class GfEntityCardComponent {
  @Input() entity: IEntity;
  @Output() entityClicked = new EventEmitter<IEntity>();

  public getEntityIcon(type?: string): string {
    switch (type) {
      case 'TRUST':
        return 'account_balance';
      case 'LLC':
      case 'CORPORATION':
        return 'business';
      case 'LP':
        return 'handshake';
      case 'FOUNDATION':
        return 'volunteer_activism';
      case 'ESTATE':
        return 'gavel';
      case 'INDIVIDUAL':
      default:
        return 'person';
    }
  }
}
