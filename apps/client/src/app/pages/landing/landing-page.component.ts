import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LineChartItem } from '@ghostfolio/client/components/line-chart/interfaces/line-chart.interface';
import { DataService } from '@ghostfolio/client/services/data.service';
import { TokenStorageService } from '@ghostfolio/client/services/token-storage.service';
import { format } from 'date-fns';
import { Subject } from 'rxjs';

@Component({
  selector: 'gf-landing-page',
  templateUrl: './landing-page.html',
  styleUrls: ['./landing-page.scss']
})
export class LandingPageComponent implements OnDestroy, OnInit {
  public currentYear = format(new Date(), 'yyyy');
  public demoAuthToken: string;
  public historicalDataItems: LineChartItem[];

  private unsubscribeSubject = new Subject<void>();

  /**
   * @constructor
   */
  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
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

    this.initializeLineChart();
  }

  public initializeLineChart() {
    this.historicalDataItems = [
      {
        date: '2017-01-01',
        value: 2561.60376
      },
      {
        date: '2017-02-01',
        value: 2261.60376
      },
      {
        date: '2017-03-01',
        value: 2268.68157074
      },
      {
        date: '2017-04-01',
        value: 2525.2942
      },
      {
        date: '2017-05-01',
        value: 2929.3595107399997
      },
      {
        date: '2017-06-01',
        value: 3088.5172438900004
      },
      {
        date: '2017-07-01',
        value: 3281.2490946300004
      },
      {
        date: '2017-08-01',
        value: 4714.57822537
      },
      {
        date: '2017-09-01',
        value: 5717.262455259565
      },
      {
        date: '2017-10-01',
        value: 5338.742482334544
      },
      {
        date: '2017-11-01',
        value: 6361.263771554509
      },
      {
        date: '2017-12-01',
        value: 8373.260491904595
      },
      {
        date: '2018-01-01',
        value: 9783.208968191562
      },
      {
        date: '2018-02-01',
        value: 7841.2667100173
      },
      {
        date: '2018-03-01',
        value: 8582.133039380678
      },
      {
        date: '2018-04-01',
        value: 5901.8362986766715
      },
      {
        date: '2018-05-01',
        value: 7367.392976151925
      },
      {
        date: '2018-06-01',
        value: 6490.164314049853
      },
      {
        date: '2018-07-01',
        value: 6365.351621654618
      },
      {
        date: '2018-08-01',
        value: 6614.532706931272
      },
      {
        date: '2018-09-01',
        value: 6402.052882414409
      },
      {
        date: '2018-10-01',
        value: 15270.327917651943
      },
      {
        date: '2018-11-01',
        value: 13929.833891940816
      },
      {
        date: '2018-12-01',
        value: 12995.832254431414
      },
      {
        date: '2019-01-01',
        value: 11792.447013828998
      },
      {
        date: '2019-02-01',
        value: 11988.224284346446
      },
      {
        date: '2019-03-01',
        value: 13536.39667099519
      },
      {
        date: '2019-04-01',
        value: 14301.83740090022
      },
      {
        date: '2019-05-01',
        value: 14902.994910520581
      },
      {
        date: '2019-06-01',
        value: 15373.418326284132
      },
      {
        date: '2019-07-01',
        value: 17545.70705465703
      },
      {
        date: '2019-08-01',
        value: 17206.28500223782
      },
      {
        date: '2019-09-01',
        value: 17782.445200108898
      },
      {
        date: '2019-10-01',
        value: 17050.25875252655
      },
      {
        date: '2019-11-01',
        value: 18517.053521416237
      },
      {
        date: '2019-12-01',
        value: 17850.649021651363
      },
      {
        date: '2020-01-01',
        value: 18817.269786559067
      },
      {
        date: '2020-02-01',
        value: 22769.842312027653
      },
      {
        date: '2020-03-01',
        value: 23065.56002316582
      },
      {
        date: '2020-04-01',
        value: 19738.122641884733
      },
      {
        date: '2020-05-01',
        value: 25112.281463810643
      },
      {
        date: '2020-06-01',
        value: 28753.054132147452
      },
      {
        date: '2020-07-01',
        value: 32207.62827031543
      },
      {
        date: '2020-08-01',
        value: 37837.88816828611
      },
      {
        date: '2020-09-01',
        value: 50018.740185519295
      },
      {
        date: '2020-10-01',
        value: 46593.322295801525
      },
      {
        date: '2020-11-01',
        value: 44440.18743231742
      },
      {
        date: '2020-12-01',
        value: 57582.23077536893
      },
      {
        date: '2021-01-01',
        value: 68823.02446077733
      },
      {
        date: '2021-02-01',
        value: 64516.42092139593
      },
      {
        date: '2021-03-01',
        value: 82465.97581106682
      },
      {
        date: '2021-03-18',
        value: 86666.03082624623
      }
    ];
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
