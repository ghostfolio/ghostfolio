import { CommonModule } from '@angular/common';
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
  imports: [CommonModule, IonIcon, MatButtonModule, MatDialogModule],
  selector: 'gf-dialog-header',
  styleUrls: ['./dialog-header.component.scss'],
  templateUrl: './dialog-header.component.html'
})
export class GfDialogHeaderComponent {
  @Input() deviceType: string;
  @Input() position: 'center' | 'left' = 'left';
  @Input() title: string;

  @Output() closeButtonClicked = new EventEmitter<void>();

  public constructor() {
    addIcons({ close });
  }

  public onClickCloseButton() {
    this.closeButtonClicked.emit();
  }
}
