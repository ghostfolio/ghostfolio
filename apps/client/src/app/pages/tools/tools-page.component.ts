import { Component, OnInit } from '@angular/core';
import { Subject } from 'rxjs';

@Component({
  selector: 'gf-tools-page',
  templateUrl: './tools-page.html',
  styleUrls: ['./tools-page.scss']
})
export class ToolsPageComponent implements OnInit {
  private unsubscribeSubject = new Subject<void>();

  /**
   * @constructor
   */
  public constructor() {}

  /**
   * Initializes the controller
   */
  public ngOnInit() {}
}
