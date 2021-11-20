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
  public testimonials = [
    {
      author: 'Philipp',
      country: 'Germany 🇩🇪',
      quote: `Super slim app with a great user interface. On top of that, it's open source.`
    },
    {
      author: 'Onur',
      country: 'Switzerland 🇨🇭',
      quote: `Ghostfolio looks like the perfect portfolio tracker I've been searching for all these years.`
    },
    {
      author: 'Ivo',
      country: 'Netherlands 🇳🇱',
      quote: `A fantastic open source app to track my investments across platforms. Love the simplicity of its design and the depth of the insights.`
    },
    {
      author: 'Damjan',
      country: 'Slovenia 🇸🇮',
      quote: `Ghostfolio helps me track all my investments in one place, it has a built-in portfolio analyzer and a very neat, seamless user interface.`
    }
  ];

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
