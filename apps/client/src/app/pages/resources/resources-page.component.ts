import { Component, OnInit } from '@angular/core';
import { Subject } from 'rxjs';

@Component({
  selector: 'gf-resources-page',
  templateUrl: './resources-page.html',
  styleUrls: ['./resources-page.scss']
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
