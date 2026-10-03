import {
  getCountryName,
  getLocale,
  getNumberFormatGroup
} from '@ghostfolio/common/helper';

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  OnDestroy
} from '@angular/core';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import svgMap from 'svgmap';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgxSkeletonLoaderModule],
  selector: 'gf-world-map-chart',
  styleUrls: ['./world-map-chart.component.scss'],
  templateUrl: './world-map-chart.component.html'
})
export class GfWorldMapChartComponent implements OnChanges, OnDestroy {
  @Input() public countries?: {
    [code: string]: { name?: string; value: number };
  };
  @Input() public format?: string;
  @Input() public isInPercentage?: boolean = false;
  @Input() public locale?: string = getLocale();

  public isLoading = true;
  public svgMapElement: any;

  public constructor(private changeDetectorRef: ChangeDetectorRef) {}

  public ngOnChanges() {
    // Create a copy before manipulating countries object
    this.countries = structuredClone(this.countries);

    if (this.countries) {
      this.isLoading = true;

      this.destroySvgMap();

      this.initialize();
    }
  }

  public ngOnDestroy() {
    this.destroySvgMap();
  }

  private initialize() {
    if (!this.countries) {
      return;
    }

    const countries = this.countries;

    if (this.isInPercentage) {
      // Convert value of countries to percentage
      let sum = 0;
      Object.keys(countries).map((country) => {
        sum += countries[country].value;
      });

      Object.keys(countries).map((country) => {
        countries[country].value = Number(
          ((countries[country].value * 100) / sum).toFixed(2)
        );
      });
    } else {
      // Convert value to fixed-point notation
      Object.keys(countries).map((country) => {
        countries[country].value = Number(
          countries[country].value.toFixed(2)
        );
      });
    }

    this.svgMapElement = new svgMap({
      colorMax: '#22bdb9',
      colorMin: '#c3f1f0',
      colorNoData: 'transparent',
      data: {
        applyData: 'value',
        data: {
          value: {
            format: this.format,
            thousandSeparator: getNumberFormatGroup(this.locale)
          }
        },
        values: countries
      },
      hideFlag: true,
      minZoom: 1.06,
      maxZoom: 1.06,
      targetElementID: 'svgMap'
    });

    this.svgMapElement.options.countryNames = Object.keys(
      this.svgMapElement.countries
    ).reduce<{ [code: string]: string }>((names, code) => {
      names[code] = getCountryName({ code });

      return names;
    }, {});

    setTimeout(() => {
      this.isLoading = false;

      this.changeDetectorRef.markForCheck();
    }, 500);
  }

  private destroySvgMap() {
    this.svgMapElement?.mapWrapper?.remove();
    this.svgMapElement?.tooltip?.remove();

    this.svgMapElement = null;
  }
}
