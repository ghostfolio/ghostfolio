import { Component, HostBinding, OnDestroy, OnInit } from '@angular/core';
import { DataService } from '@ghostfolio/client/services/data.service';
import { Subject } from 'rxjs';

@Component({
  selector: 'gf-admin-page',
  styleUrls: ['./admin-page.scss'],
  templateUrl: './admin-page.html'
})
export class AdminPageComponent implements OnDestroy, OnInit {
  @HostBinding('class.with-info-message') get getHasMessage() {
    return this.hasMessage;
  }

  public hasMessage: boolean;
  public tabs: { iconName: string; label: string; path: string }[] = [];

  private unsubscribeSubject = new Subject<void>();

  public constructor(private dataService: DataService) {
    const { systemMessage } = this.dataService.fetchInfo();

    this.hasMessage = !!systemMessage;
  }

  public ngOnInit() {
    this.tabs = [
      {
        iconName: 'reader-outline',
        label: $localize`Overview`,
        path: 'overview'
      },
      {
        iconName: 'settings-outline',
        label: $localize`Settings`,
        path: 'settings'
      },
      {
        iconName: 'server-outline',
        label: $localize`Market Data`,
        path: 'market-data'
      },
      { iconName: 'flash-outline', label: $localize`Jobs`, path: 'jobs' },
      { iconName: 'people-outline', label: $localize`Users`, path: 'users' }
    ];
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
