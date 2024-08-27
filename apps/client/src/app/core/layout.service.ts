import { Injectable } from '@angular/core';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Observable, Subject } from 'rxjs';

import { NotificationService } from './notification/notification.service';

@Injectable({
  providedIn: 'root'
})
export class LayoutService {
  public static readonly DEFAULT_NOTIFICATION_MAX_WIDTH = '50rem';
  public static readonly DEFAULT_NOTIFICATION_WIDTH = '75vw';

  public shouldReloadContent$: Observable<void>;

  private shouldReloadSubject = new Subject<void>();

  public constructor(
    private deviceService: DeviceDetectorService,
    private notificationService: NotificationService
  ) {
    this.shouldReloadContent$ = this.shouldReloadSubject.asObservable();

    const deviceType = this.deviceService.getDeviceInfo().deviceType;

    this.notificationService.setDialogWidth(
      deviceType === 'mobile'
        ? '95vw'
        : LayoutService.DEFAULT_NOTIFICATION_WIDTH
    );

    this.notificationService.setDialogMaxWidth(
      deviceType === 'mobile'
        ? '95vw'
        : LayoutService.DEFAULT_NOTIFICATION_MAX_WIDTH
    );
  }

  public getShouldReloadSubject() {
    return this.shouldReloadSubject;
  }
}
