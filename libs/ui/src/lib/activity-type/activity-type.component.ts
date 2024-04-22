import { translate } from '@ghostfolio/ui/i18n';

import { CommonModule } from '@angular/common';
import {
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges
} from '@angular/core';
import { Type as ActivityType } from '@prisma/client';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'gf-activity-type',
  standalone: true,
  styleUrls: ['./activity-type.component.scss'],
  templateUrl: './activity-type.component.html'
})
export class GfActivityTypeComponent implements OnChanges {
  @Input() activityType: ActivityType;

  public activityTypeLabel: string;

  public constructor() {}

  public ngOnChanges() {
    this.activityTypeLabel = translate(this.activityType);
  }
}
