import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { close } from 'ionicons/icons';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'justify-content-center' },
  imports: [IonIcon, MatButtonModule, MatDialogModule],
  selector: 'gf-dialog-footer',
  styleUrls: ['./dialog-footer.component.scss'],
  templateUrl: './dialog-footer.component.html'
})
export class GfDialogFooterComponent {
  @Input() deviceType: string;

  @Output() closeButtonClicked = new EventEmitter<void>();

  public constructor() {
    addIcons({ close });
  }

  public onClickCloseButton() {
    this.closeButtonClicked.emit();
  }
}
