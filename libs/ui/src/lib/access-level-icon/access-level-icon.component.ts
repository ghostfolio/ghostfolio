import { AccessLevel } from '@ghostfolio/common/types';

import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'gf-access-level-icon',
  templateUrl: './access-level-icon.component.html'
})
export class GfAccessLevelIconComponent {
  public readonly accessLevel = input.required<AccessLevel>();
}
