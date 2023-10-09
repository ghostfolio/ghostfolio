import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';
import { Subject } from 'rxjs';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'gf-admin-settings',
  styleUrls: ['./admin-settings.component.scss'],
  templateUrl: './admin-settings.component.html'
})
export class AdminSettingsComponent implements OnInit, OnDestroy {
  private unsubscribeSubject = new Subject<void>();

  public constructor() {}

  public ngOnInit() {}

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
