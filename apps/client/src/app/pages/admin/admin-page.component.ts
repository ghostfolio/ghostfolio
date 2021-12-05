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

  private unsubscribeSubject = new Subject<void>();

  /**
   * @constructor
   */
  public constructor(private dataService: DataService) {
    const { systemMessage } = this.dataService.fetchInfo();

    this.hasMessage = !!systemMessage;
  }

  /**
   * Initializes the controller
   */
  public ngOnInit() {}

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
