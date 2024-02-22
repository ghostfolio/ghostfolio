import { UNKNOWN_KEY } from '@ghostfolio/common/config';
import { getLocale } from '@ghostfolio/common/helper';
import { Position } from '@ghostfolio/common/interfaces';

import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnDestroy,
  OnInit
} from '@angular/core';
import { Subject } from 'rxjs';

@Component({
  selector: 'gf-position',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './position.component.html',
  styleUrls: ['./position.component.scss']
})
export class PositionComponent implements OnDestroy, OnInit {
  @Input() baseCurrency: string;
  @Input() deviceType: string;
  @Input() isLoading: boolean;
  @Input() locale = getLocale();
  @Input() position: Position;
  @Input() range: string;

  public unknownKey = UNKNOWN_KEY;

  private unsubscribeSubject = new Subject<void>();

  public constructor() {}

  public ngOnInit() {}

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
