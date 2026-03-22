import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Input
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { RouterModule } from '@angular/router';

export interface NavMenuItem {
  label: string;
  routerLink: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatButtonModule, MatMenuModule, RouterModule],
  selector: 'gf-nav-menu-group',
  standalone: true,
  styles: [
    `
      :host {
        display: inline-block;
      }

      .nav-trigger {
        text-transform: none;
        letter-spacing: normal;
      }

      .font-weight-bold {
        font-weight: 700;
      }

      .text-decoration-underline {
        text-decoration: underline;
      }
    `
  ],
  template: `
    <button
      class="nav-trigger"
      mat-flat-button
      [matMenuTriggerFor]="dropdownMenu"
      [ngClass]="{
        'font-weight-bold': isActive,
        'text-decoration-underline': isActive
      }"
    >
      {{ label }}
    </button>
    <mat-menu #dropdownMenu="matMenu" xPosition="after">
      @for (item of menuItems; track item.routerLink) {
        <a mat-menu-item [routerLink]="item.routerLink">
          {{ item.label }}
        </a>
      }
    </mat-menu>
  `
})
export class GfNavMenuGroupComponent {
  @Input() public isActive: boolean = false;
  @Input() public label: string = '';
  @Input() public menuItems: NavMenuItem[] = [];
}
