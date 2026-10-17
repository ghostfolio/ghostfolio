import {
  ChangeDetectionStrategy,
  Component,
  input,
  output
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
  selector: 'gf-dialog-header',
  styleUrls: ['./dialog-header.component.scss'],
  templateUrl: './dialog-header.component.html'
})
export class GfDialogHeaderComponent {
  public readonly deviceType = input<string>();
  public readonly position = input<'center' | 'left'>('left');
  public readonly title = input.required<string | null | undefined>();

  public readonly closeButtonClicked = output<void>();

  public constructor() {
    addIcons({ close });
  }

  protected onClickCloseButton() {
    this.closeButtonClicked.emit();
  }
}
