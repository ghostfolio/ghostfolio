import { DataService } from '@ghostfolio/client/services/data.service';
import { Statistics } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';

import { Component, OnDestroy, OnInit } from '@angular/core';
import { format } from 'date-fns';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Subject } from 'rxjs';

@Component({
  host: { class: 'page' },
  selector: 'gf-landing-page',
  styleUrls: ['./landing-page.scss'],
  templateUrl: './landing-page.html'
})
export class LandingPageComponent implements OnDestroy, OnInit {
  public countriesOfSubscribersMap: {
    [code: string]: { value: number };
  } = {};
  public currentYear = format(new Date(), 'yyyy');
  public deviceType: string;
  public hasPermissionForDemo: boolean;
  public hasPermissionForStatistics: boolean;
  public hasPermissionForSubscription: boolean;
  public hasPermissionToCreateUser: boolean;
  public routerLinkAbout = ['/' + $localize`about`];
  public routerLinkRegister = ['/' + $localize`register`];
  public statistics: Statistics;
  public testimonials = [
    {
      author: 'Damjan',
      country: 'Slovenia 🇸🇮',
      quote:
        'Ghostfolio helps me track all my investments in one place, it has a built-in portfolio analyzer and a very neat, seamless user interface.'
    },
    {
      author: 'Ivo',
      country: 'Netherlands 🇳🇱',
      quote:
        'A fantastic open source app to track my investments across platforms. Love the simplicity of its design and the depth of the insights.'
    },
    {
      author: 'Lars',
      country: 'Denmark 🇩🇰',
      quote: 'Great app!'
    },
    {
      author: 'Marius',
      country: 'Romania 🇷🇴',
      quote:
        'Ghostfolio is an awesome project. It helps me keep track of cryptocurrencies in an easy way. I really like it!',
      url: 'https://mariushosting.com'
    },
    {
      author: 'Onur',
      country: 'Switzerland 🇨🇭',
      quote:
        'Ghostfolio looks like the perfect portfolio tracker I’ve been searching for all these years.'
    },
    {
      author: 'Philipp',
      country: 'Germany 🇩🇪',
      quote:
        'Super slim app with a great user interface. On top of that, it’s open source.'
    },
    {
      author: 'Sal',
      country: 'Canada 🇨🇦',
      quote:
        'Ghostfolio is one of the best tools I have used for tracking my investments. I intend to spread the word to all my friends.'
    },
    {
      author: 'Thomas',
      country: 'Creator of Ghostfolio, Switzerland 🇨🇭',
      quote:
        'My investment strategy has become more structured through the daily use of Ghostfolio.',
      url: 'https://dotsilver.ch'
    }
  ];

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private dataService: DataService,
    private deviceService: DeviceDetectorService
  ) {
    const {
      countriesOfSubscribers = [],
      demoAuthToken,
      globalPermissions,
      statistics
    } = this.dataService.fetchInfo();

    for (const country of countriesOfSubscribers) {
      this.countriesOfSubscribersMap[country] = {
        value: 1
      };
    }

    this.hasPermissionForDemo = !!demoAuthToken;
    this.hasPermissionForStatistics = hasPermission(
      globalPermissions,
      permissions.enableStatistics
    );

    this.hasPermissionForSubscription = hasPermission(
      globalPermissions,
      permissions.enableSubscription
    );

    this.hasPermissionToCreateUser = hasPermission(
      globalPermissions,
      permissions.createUserAccount
    );

    this.statistics = statistics;
  }

  public ngOnInit() {
    this.deviceType = this.deviceService.getDeviceInfo().deviceType;
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
