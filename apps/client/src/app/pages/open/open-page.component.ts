import { Component, OnDestroy, OnInit } from '@angular/core';
import { DataService } from '@ghostfolio/client/services/data.service';
import { Statistics } from '@ghostfolio/common/interfaces/statistics.interface';
import { Subject } from 'rxjs';

@Component({
  host: { class: 'page' },
  selector: 'gf-open-page',
  styleUrls: ['./open-page.scss'],
  templateUrl: './open-page.html'
})
export class OpenPageComponent implements OnDestroy, OnInit {
  public statistics: Statistics;

  private unsubscribeSubject = new Subject<void>();

  public constructor(private dataService: DataService) {
    const { statistics } = this.dataService.fetchInfo();

    this.statistics = statistics;
  }

  public ngOnInit() {}

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
