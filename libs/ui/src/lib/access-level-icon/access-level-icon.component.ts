import { AccessLevel } from '@ghostfolio/common/types';

import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  createOutline,
  lockClosedOutline,
  lockOpenOutline
} from 'ionicons/icons';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonIcon],
  selector: 'gf-access-level-icon',
  templateUrl: './access-level-icon.component.html'
})
export class GfAccessLevelIconComponent {
  public readonly accessLevel = input.required<AccessLevel>();

  public constructor() {
    addIcons({ createOutline, lockClosedOutline, lockOpenOutline });
  }
}
