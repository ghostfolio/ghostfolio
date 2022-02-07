import { Component, OnInit } from '@angular/core';
import { Subject } from 'rxjs';

@Component({
  host: { class: 'page' },
  selector: 'gf-resources-page',
  styleUrls: ['./resources-page.scss'],
  templateUrl: './resources-page.html'
})
export class ResourcesPageComponent implements OnInit {
  private unsubscribeSubject = new Subject<void>();

  /**
   * @constructor
   */
  public constructor() {}

  /**
   * Initializes the controller
   */
  public ngOnInit() {}

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
