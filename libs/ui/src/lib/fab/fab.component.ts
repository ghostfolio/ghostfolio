import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { Params, RouterModule } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline } from 'ionicons/icons';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonIcon, MatButtonModule, RouterModule],
  selector: 'gf-fab',
  styleUrls: ['./fab.component.scss'],
  templateUrl: './fab.component.html'
})
export class GfFabComponent {
  public readonly queryParams = input.required<Params>();

  public constructor() {
    addIcons({ addOutline });
  }
}
