import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { resolveFearAndGreedIndex } from 'libs/helper/src';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { DataService } from '../../services/data.service';
import { TokenStorageService } from '../../services/token-storage.service';

@Component({
  selector: 'gf-resources-page',
  templateUrl: './resources-page.html',
  styleUrls: ['./resources-page.scss']
})
export class ResourcesPageComponent implements OnInit {
  public currentFearAndGreedIndex: number;
  public currentFearAndGreedIndexAsText: string;
  public isLoggedIn: boolean;

  private unsubscribeSubject = new Subject<void>();

  /**
   * @constructor
   */
  public constructor(
    private cd: ChangeDetectorRef,
    private dataService: DataService,
    private tokenStorageService: TokenStorageService
  ) {}

  /**
   * Initializes the controller
   */
  public ngOnInit() {
    this.isLoggedIn = !!this.tokenStorageService.getToken();

    if (this.isLoggedIn) {
      this.dataService
        .fetchSymbolItem('GF.FEAR_AND_GREED_INDEX')
        .pipe(takeUntil(this.unsubscribeSubject))
        .subscribe(({ marketPrice }) => {
          this.currentFearAndGreedIndex = marketPrice;
          this.currentFearAndGreedIndexAsText = resolveFearAndGreedIndex(
            this.currentFearAndGreedIndex
          ).text;

          this.cd.markForCheck();
        });
    }
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
