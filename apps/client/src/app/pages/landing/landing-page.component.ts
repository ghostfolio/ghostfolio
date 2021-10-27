import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DataService } from '@ghostfolio/client/services/data.service';
import { TokenStorageService } from '@ghostfolio/client/services/token-storage.service';
import { format } from 'date-fns';
import { Subject } from 'rxjs';

@Component({
  host: { class: 'mb-5' },
  selector: 'gf-landing-page',
  styleUrls: ['./landing-page.scss'],
  templateUrl: './landing-page.html'
})
export class LandingPageComponent implements OnDestroy, OnInit {
  public currentYear = format(new Date(), 'yyyy');
  public demoAuthToken: string;

  private unsubscribeSubject = new Subject<void>();

  /**
   * @constructor
   */
  public constructor(
    private dataService: DataService,
    private router: Router,
    private tokenStorageService: TokenStorageService
  ) {}

  /**
   * Initializes the controller
   */
  public ngOnInit() {
    const { demoAuthToken } = this.dataService.fetchInfo();

    this.demoAuthToken = demoAuthToken;
  }

  public setToken(aToken: string) {
    this.tokenStorageService.saveToken(aToken, true);

    this.router.navigate(['/']);
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
