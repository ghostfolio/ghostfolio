import { Component, OnDestroy, OnInit } from '@angular/core';
import { DataService } from '@ghostfolio/client/services/data.service';
import { Statistics } from '@ghostfolio/common/interfaces/statistics.interface';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { format } from 'date-fns';
import { Subject } from 'rxjs';

@Component({
  host: { class: 'page' },
  selector: 'gf-landing-page',
  styleUrls: ['./landing-page.scss'],
  templateUrl: './landing-page.html'
})
export class LandingPageComponent implements OnDestroy, OnInit {
  public currentYear = format(new Date(), 'yyyy');
  public demoAuthToken: string;
  public hasPermissionForStatistics: boolean;
  public statistics: Statistics;
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

  public constructor(private dataService: DataService) {
    const { globalPermissions, statistics } = this.dataService.fetchInfo();

    this.hasPermissionForStatistics = hasPermission(
      globalPermissions,
      permissions.enableStatistics
    );

    this.statistics = statistics;
  }

  public ngOnInit() {}

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
