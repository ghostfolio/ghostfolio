import { translate } from '@ghostfolio/ui/i18n';

import { CommonModule } from '@angular/common';
import {
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges
} from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { Type as ActivityType } from '@prisma/client';
import { addIcons } from 'ionicons';
import {
  addCircleOutline,
  arrowDownCircleOutline,
  arrowUpCircleOutline,
  cubeOutline,
  flameOutline,
  hammerOutline
} from 'ionicons/icons';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, IonIcon],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'gf-activity-type',
  styleUrls: ['./activity-type.component.scss'],
  templateUrl: './activity-type.component.html'
})
export class GfActivityTypeComponent implements OnChanges {
  @Input() activityType: ActivityType;

  public activityTypeLabel: string;

  public constructor() {
    addIcons({
      addCircleOutline,
      arrowDownCircleOutline,
      arrowUpCircleOutline,
      cubeOutline,
      flameOutline,
      hammerOutline
    });
  }

  public ngOnChanges() {
    this.activityTypeLabel = translate(this.activityType);
  }
}
