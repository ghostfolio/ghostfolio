import { NotificationService } from '@ghostfolio/ui/notifications';

import { inject, Service } from '@angular/core';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Observable, Subject } from 'rxjs';

@Service()
export class LayoutService {
  public static readonly DEFAULT_NOTIFICATION_MAX_WIDTH = '50rem';
  public static readonly DEFAULT_NOTIFICATION_WIDTH = '75vw';

  public shouldReloadContent$: Observable<void>;

  private readonly deviceDetectorService = inject(DeviceDetectorService);
  private readonly notificationService = inject(NotificationService);
  private shouldReloadSubject = new Subject<void>();

  public constructor() {
    this.shouldReloadContent$ = this.shouldReloadSubject.asObservable();

    const deviceType = this.deviceDetectorService.getDeviceInfo().deviceType;

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
