import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output
} from '@angular/core';
import { addIcons } from 'ionicons';
import { close } from 'ionicons/icons';

@Component({
  host: { class: 'justify-content-center' },
  selector: 'gf-dialog-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dialog-footer.component.html',
  styleUrls: ['./dialog-footer.component.scss'],
  standalone: false
})
export class DialogFooterComponent {
  @Input() deviceType: string;

  @Output() closeButtonClicked = new EventEmitter<void>();

  public constructor() {
    addIcons({ close });
  }

  public onClickCloseButton() {
    this.closeButtonClicked.emit();
  }
}
