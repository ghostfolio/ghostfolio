import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output
} from '@angular/core';
import { FormControl } from '@angular/forms';
import { ToggleOption } from '@ghostfolio/common/types';

@Component({
  selector: 'gf-toggle',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './toggle.component.html',
  styleUrls: ['./toggle.component.scss']
})
export class ToggleComponent implements OnChanges, OnInit {
  @Input() defaultValue: string;
  @Input() isLoading: boolean;
  @Input() options: ToggleOption[];

  @Output() change = new EventEmitter<Pick<ToggleOption, 'value'>>();

  public option = new FormControl<string>(undefined);

  public constructor() {}

  public ngOnInit() {}

  public ngOnChanges() {
    this.option.setValue(this.defaultValue);
  }

  public onValueChange() {
    this.change.emit({ value: this.option.value });
  }
}
