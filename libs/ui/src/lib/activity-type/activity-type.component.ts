import { translate } from '@ghostfolio/ui/i18n';

import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges
} from '@angular/core';
import { Type as ActivityType } from '@prisma/client';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'gf-activity-type',
  styleUrls: ['./activity-type.component.scss'],
  templateUrl: './activity-type.component.html'
})
export class ActivityTypeComponent implements OnChanges {
  @Input() activityType: ActivityType;

  public activityTypeLabel: string;

  public constructor() {}

  public ngOnChanges() {
    this.activityTypeLabel = translate(this.activityType);
  }
}
