import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { StrategyStep } from '../../models/strategy-flow.types';

@Component({
  imports: [CommonModule],
  selector: 'gf-strategy-card',
  styleUrls: ['./strategy-card.component.scss'],
  templateUrl: './strategy-card.component.html'
})
export class GfStrategyCardComponent {
  @Input() step: StrategyStep;
  @Input() disabled = false;
  @Output() optionSelected = new EventEmitter<string>();

  public selectOption(value: string): void {
    if (!this.disabled) {
      this.optionSelected.emit(value);
    }
  }
}
